package com.example.gpaylistener

import android.content.ComponentName
import android.content.Context
import android.service.notification.NotificationListenerService
import android.util.Log
import androidx.work.Worker
import androidx.work.WorkerParameters
import android.content.pm.PackageManager
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class RebindWorker(appContext: Context, workerParams: WorkerParameters) : Worker(appContext, workerParams) {

    override fun doWork(): Result {
        try {
            val componentName = ComponentName(applicationContext, GPayListenerService::class.java)
            val pm = applicationContext.packageManager
            
            // 1. Physically disable the service component (Forces Android to unbind)
            pm.setComponentEnabledSetting(
                componentName,
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP
            )
            
            // 2. Re-enable the service component
            pm.setComponentEnabledSetting(
                componentName,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP
            )
            
            // 3. Ask for a rebind just to be safe
            NotificationListenerService.requestRebind(componentName)
            
            appendLog("HEARTBEAT: Hard-toggled service component to bypass OS death")
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
