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

class GPayListenerService : NotificationListenerService() {

    // GPay's package name — do not change
    private val GPAY_PACKAGE = "com.google.android.apps.nbu.paisa.user"

    // Automatically injected securely via local.properties and Github Secrets
    private val BACKEND_URL = BuildConfig.BACKEND_URL 
    private val API_KEY = BuildConfig.API_KEY

    private val client = OkHttpClient()

    private fun appendLog(message: String) {
        val prefs = applicationContext.getSharedPreferences("GPayLogs", Context.MODE_PRIVATE)
        val currentLogs = prefs.getString("logs", "") ?: ""
        val time = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        val newLog = "[$time] $message\n$currentLogs"
        prefs.edit().putString("logs", newLog.take(2000)).apply() // keep last 2000 chars
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
            if (fullText.contains("debited", ignoreCase = true) || fullText.contains("Rs.", ignoreCase = true) || fullText.contains("Paid", ignoreCase = true)) {
                appendLog("Failed to parse regex: $fullText")
            }
            return
        }

        appendLog("Parsed: Rs ${parsed.first} to ${parsed.second}")
        postTransaction(parsed.first, parsed.second)
    }

    private fun parseTransaction(text: String): Pair<Double, String>? {
        // Pattern 1: "Paid ₹450 to Swiggy" or "You paid ₹1,200 to Zomato"
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
            return Pair(amount, merchant)
        }

        return null  // Notification didn't match — skip it
    }

    private fun postTransaction(amount: Double, merchant: String) {
        val json = JSONObject().apply {
            put("merchant", merchant)
            put("amount", amount)
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
