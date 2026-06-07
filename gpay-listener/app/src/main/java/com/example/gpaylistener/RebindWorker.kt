package com.example.gpaylistener

import android.content.ComponentName
import android.content.Context
import android.service.notification.NotificationListenerService
import android.util.Log
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class RebindWorker(appContext: Context, workerParams: WorkerParameters) : Worker(appContext, workerParams) {

    override fun doWork(): Result {
        try {
            // Ping the Android OS to forcibly rebind the NotificationListenerService
            val componentName = ComponentName(applicationContext, GPayListenerService::class.java)
            NotificationListenerService.requestRebind(componentName)
            
            // Log it so the user can verify the heartbeat is working
            appendLog("HEARTBEAT: WorkManager requested OS rebind")
            Log.d("RebindWorker", "Successfully requested rebind.")
            return Result.success()
        } catch (e: Exception) {
            Log.e("RebindWorker", "Failed to request rebind", e)
            appendLog("HEARTBEAT ERROR: ${e.message}")
            return Result.retry()
        }
    }

    private fun appendLog(message: String) {
        val prefs = applicationContext.getSharedPreferences("GPayLogs", Context.MODE_PRIVATE)
        val currentLogs = prefs.getString("logs", "") ?: ""
        val time = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        val newLog = "[$time] $message\n$currentLogs"
        prefs.edit().putString("logs", newLog.take(2000)).apply() // keep last 2000 chars
    }
}
