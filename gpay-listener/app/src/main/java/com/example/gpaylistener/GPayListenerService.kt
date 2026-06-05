package com.example.gpaylistener

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import android.content.Context
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

import java.util.concurrent.TimeUnit

class GPayListenerService : NotificationListenerService() {

    // GPay's package name — do not change
    private val GPAY_PACKAGE = "com.google.android.apps.nbu.paisa.user"

    // Automatically injected securely via local.properties and Github Secrets
    private val BACKEND_URL = BuildConfig.BACKEND_URL 
    private val API_KEY = BuildConfig.API_KEY

    private val client = OkHttpClient.Builder()
        .connectTimeout(180, TimeUnit.SECONDS)
        .readTimeout(180, TimeUnit.SECONDS)
        .writeTimeout(180, TimeUnit.SECONDS)
        .build()

    private fun appendLog(message: String) {
        val prefs = applicationContext.getSharedPreferences("GPayLogs", Context.MODE_PRIVATE)
        val currentLogs = prefs.getString("logs", "") ?: ""
        val time = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        val newLog = "[$time] $message\n$currentLogs"
        prefs.edit().putString("logs", newLog.take(2000)).apply() // keep last 2000 chars
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        appendLog("SERVICE BIND SUCCESS: Listening to notifications...")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        appendLog("SERVICE DISCONNECTED by Android OS.")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        // We now process notifications from any app (like SMS for KVB bank)

        val extras = sbn.notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""

        // Combine title + text + bigText for broader matching
        val fullText = "$title $text $bigText"

        val parsed = parseTransaction(fullText)
        if (parsed == null) {
            val lowerText = fullText.lowercase()
            if (lowerText.contains("debited") || lowerText.contains("credited") || 
                lowerText.contains("rs.") || lowerText.contains("paid") || 
                lowerText.contains("kvb") || lowerText.contains("upi") || lowerText.contains("sent")) {
                appendLog("Failed to parse regex [${sbn.packageName}]: $fullText")
            }
            return
        }

        // --- DEDUPLICATION LOGIC ---
        // If bank and GPay both notify within 60s, ignore the second one
        val prefs = applicationContext.getSharedPreferences("GPayLogs", Context.MODE_PRIVATE)
        val lastAmount = prefs.getFloat("last_amount", -1f)
        val lastType = prefs.getString("last_type", "")
        val lastTime = prefs.getLong("last_time", 0L)
        val currentTime = System.currentTimeMillis()

        if (parsed.first.toFloat() == lastAmount && parsed.third == lastType && (currentTime - lastTime) < 60000) {
            appendLog("Ignored duplicate notification: Rs ${parsed.first} (${parsed.third})")
            return
        }

        prefs.edit()
            .putFloat("last_amount", parsed.first.toFloat())
            .putString("last_type", parsed.third)
            .putLong("last_time", currentTime)
            .apply()
        // --------------------------

        appendLog("Parsed: Rs ${parsed.first} ${if(parsed.third == "income") "from" else "to"} ${parsed.second}")
        postTransaction(parsed.first, parsed.second, parsed.third)
    }

    private fun parseTransaction(text: String): Triple<Double, String, String>? {
        // --- OUTGOING (EXPENSE) ---
        // Pattern 1: "Paid ₹450 to Swiggy"
        val pattern1 = Regex("""[Pp]aid?\s*₹([\d,]+\.?\d*)\s+to\s+(.+)""")
        // Pattern 2: "₹450 sent to Swiggy"
        val pattern2 = Regex("""₹([\d,]+\.?\d*)\s+sent to\s+(.+)""")
        // Pattern 3: "Payment of ₹450 to Swiggy successful"
        val pattern3 = Regex("""[Pp]ayment of\s*₹([\d,]+\.?\d*)\s+to\s+(.+?)\s+successful""")
        // Pattern 4: KVB Bank SMS ("debited Rs. 1.00 on 05-Jun-2026 to DHINAKARAN info")
        val pattern4 = Regex("""debited\s*(?:Rs\.?|INR)\s*([\d,]+\.?\d*).*?to\s+([A-Za-z0-9\s]+?)\s+info""", RegexOption.IGNORE_CASE)

        for (pattern in listOf(pattern1, pattern2, pattern3, pattern4)) {
            val match = pattern.find(text) ?: continue
            val amount = match.groupValues[1].replace(",", "").toDoubleOrNull() ?: continue
            val merchant = match.groupValues[2].trim()
            return Triple(amount, merchant, "expense")
        }

        // --- INCOMING (INCOME) ---
        // Pattern 5: GPay Incoming ("DHINAKARAN paid you ₹2.00")
        val pattern5 = Regex("""([A-Za-z0-9\s]+?)\s+paid you\s*₹([\d,]+\.?\d*)""", RegexOption.IGNORE_CASE)
        // Pattern 6: KVB Bank Incoming ("credited Rs. 2.00 from DHINAKARAN")
        val pattern6 = Regex("""credited\s*(?:Rs\.?|INR)\s*([\d,]+\.?\d*).*?from\s+([A-Za-z0-9\s]+?)\s+on""", RegexOption.IGNORE_CASE)

        for (pattern in listOf(pattern5)) {
            val match = pattern.find(text) ?: continue
            val merchant = match.groupValues[1].trim()
            val amount = match.groupValues[2].replace(",", "").toDoubleOrNull() ?: continue
            return Triple(amount, merchant, "income")
        }
        for (pattern in listOf(pattern6)) {
            val match = pattern.find(text) ?: continue
            val amount = match.groupValues[1].replace(",", "").toDoubleOrNull() ?: continue
            val merchant = match.groupValues[2].trim()
            return Triple(amount, merchant, "income")
        }

        return null
    }

    private fun postTransaction(amount: Double, merchant: String, type: String) {
        val json = JSONObject().apply {
            put("merchant", merchant)
            put("amount", amount)
            put("type", type)
        }

        val body = json.toString().toRequestBody("application/json".toMediaType())

        // Check if BACKEND_URL is valid before proceeding
        if (BACKEND_URL.isBlank()) {
            appendLog("ERROR: BACKEND_URL is empty! Check GitHub Secrets.")
            return
        }

        val request = Request.Builder()
            .url(BACKEND_URL)
            .addHeader("X-API-Key", API_KEY)
            .post(body)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                appendLog("Network Fail: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    appendLog("Success: POSTed Rs $amount to $merchant")
                } else {
                    appendLog("Server Error: ${response.code} rejected transaction")
                }
                response.close()
            }
        })
    }
}
