package com.example.gpaylistener

import android.content.Intent
import android.provider.Settings
import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.widget.TextView
import android.os.PowerManager
import android.net.Uri
import android.content.ComponentName
import android.service.notification.NotificationListenerService
import android.widget.Toast
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.ExistingPeriodicWorkPolicy
import java.util.concurrent.TimeUnit

import android.widget.EditText

class MainActivity : AppCompatActivity() {
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var tvLogs: TextView

    private val updateLogsTask = object : Runnable {
        override fun run() {
            val prefs = getSharedPreferences("GPayLogs", Context.MODE_PRIVATE)
            val logs = prefs.getString("logs", "No logs yet.")
            tvLogs.text = logs
            handler.postDelayed(this, 2000) // update every 2s
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvLogs = findViewById(R.id.tvLogs)

        findViewById<Button>(R.id.btnEnable).setOnClickListener {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }

        findViewById<Button>(R.id.btnRebind).setOnClickListener {
            try {
                val componentName = ComponentName(applicationContext, GPayListenerService::class.java)
                NotificationListenerService.requestRebind(componentName)
                Toast.makeText(this, "Requested OS to restart listener!", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this, "Failed to rebind: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }

        // User ID input
        val etUserId = findViewById<EditText>(R.id.etUserId)
        val prefs = getSharedPreferences("GPayLogs", Context.MODE_PRIVATE)
        val savedUserId = prefs.getString("user_id", "") ?: ""
        etUserId.setText(savedUserId)

        findViewById<Button>(R.id.btnSaveUserId).setOnClickListener {
            val userId = etUserId.text.toString().trim()
            if (userId.isEmpty()) {
                Toast.makeText(this, "Please enter your User ID!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            prefs.edit().putString("user_id", userId).apply()
            Toast.makeText(this, "User ID saved: $userId", Toast.LENGTH_SHORT).show()
        }

        // Check Battery Optimization
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        if (!pm.isIgnoringBatteryOptimizations(packageName)) {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:$packageName")
            }
            startActivity(intent)
        }

        // Schedule the Heartbeat Worker
        val workRequest = PeriodicWorkRequestBuilder<RebindWorker>(15, TimeUnit.MINUTES).build()
        WorkManager.getInstance(applicationContext).enqueueUniquePeriodicWork(
            "ListenerHeartbeat",
            ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )
    }

    override fun onResume() {
        super.onResume()
        handler.post(updateLogsTask)
    }

    override fun onPause() {
        super.onPause()
        handler.removeCallbacks(updateLogsTask)
    }
}
