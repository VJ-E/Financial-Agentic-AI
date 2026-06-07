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

        // Check Battery Optimization
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        if (!pm.isIgnoringBatteryOptimizations(packageName)) {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:$packageName")
            }
            startActivity(intent)
        }
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
