package com.example.gpaylistener

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

class GPayListenerService : NotificationListenerService() {

    // GPay's package name — do not change
    private val GPAY_PACKAGE = "com.google.android.apps.nbu.paisa.user"

    // Your backend URL — change this to your deployed or local IP
    // Ensure you update YOUR_BACKEND_URL to the correct IP if running locally
    private val BACKEND_URL = "http://10.0.2.2:8000/finance/ingest" 
    private val API_KEY = "your-secret-key-here"  // must match backend

    private val client = OkHttpClient()

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        // Only process GPay notifications
        if (sbn.packageName != GPAY_PACKAGE) return

        val extras = sbn.notification.extras
        val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
        val text = extras.getString(Notification.EXTRA_TEXT) ?: ""

        // Combine title + text for broader matching
        val fullText = "$title $text"

        val parsed = parseTransaction(fullText) ?: return

        postTransaction(parsed.first, parsed.second)
    }

    private fun parseTransaction(text: String): Pair<Double, String>? {
        // Pattern 1: "Paid ₹450 to Swiggy" or "You paid ₹1,200 to Zomato"
        val pattern1 = Regex("""[Pp]aid?\s*₹([\d,]+\.?\d*)\s+to\s+(.+)""")
        // Pattern 2: "₹450 sent to Swiggy"
        val pattern2 = Regex("""₹([\d,]+\.?\d*)\s+sent to\s+(.+)""")
        // Pattern 3: "Payment of ₹450 to Swiggy successful"
        val pattern3 = Regex("""[Pp]ayment of\s*₹([\d,]+\.?\d*)\s+to\s+(.+?)\s+successful""")

        for (pattern in listOf(pattern1, pattern2, pattern3)) {
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

        val request = Request.Builder()
            .url(BACKEND_URL)
            .addHeader("X-API-Key", API_KEY)
            .post(body)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                // Silent fail — transaction was not logged
                // Optional: save to local queue and retry later
            }

            override fun onResponse(call: Call, response: Response) {
                // Transaction logged successfully
            }
        })
    }
}
