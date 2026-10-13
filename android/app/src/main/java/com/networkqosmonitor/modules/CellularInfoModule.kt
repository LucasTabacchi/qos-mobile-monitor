package com.networkqosmonitor.modules

import android.Manifest
import android.content.pm.PackageManager
import android.telephony.*
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

/**
 * CellularInfoModule
 *
 * Exposes RSSI, network type (LTE/5G/3G/2G), and carrier operator name
 * to JavaScript via React Native's Bridge / TurboModule interface.
 *
 * Android permissions required (add to AndroidManifest.xml):
 *   <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
 *   <uses-permission android:name="android.permission.READ_PHONE_STATE" />
 */
@ReactModule(name = CellularInfoModule.NAME)
class CellularInfoModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "CellularInfoModule"
    }

    override fun getName(): String = NAME

    /**
     * Returns a promise that resolves with:
     * {
     *   rssi: number | null,        // dBm (negative value, e.g. -75)
     *   operator: string | null,    // e.g. "Claro AR"
     *   cellType: string | null     // "LTE", "NR" (5G), "UMTS", "EDGE", etc.
     * }
     */
    @ReactMethod
    fun getCellularInfo(promise: Promise) {
        try {
            val telephonyManager = reactApplicationContext
                .getSystemService(android.content.Context.TELEPHONY_SERVICE) as TelephonyManager

            val result = Arguments.createMap()

            // ── Operator name ──────────────────────────────────────────────
            val operatorName = telephonyManager.networkOperatorName
            result.putString("operator", operatorName.ifEmpty { null })

            // ── Network type (requires READ_PHONE_STATE) ───────────────────
            val hasPhoneState = ContextCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.READ_PHONE_STATE
            ) == PackageManager.PERMISSION_GRANTED

            val cellType = if (hasPhoneState) {
                when (telephonyManager.dataNetworkType) {
                    TelephonyManager.NETWORK_TYPE_NR -> "5G"
                    TelephonyManager.NETWORK_TYPE_LTE -> "LTE"
                    TelephonyManager.NETWORK_TYPE_HSPAP,
                    TelephonyManager.NETWORK_TYPE_HSDPA,
                    TelephonyManager.NETWORK_TYPE_HSUPA,
                    TelephonyManager.NETWORK_TYPE_HSPA,
                    TelephonyManager.NETWORK_TYPE_UMTS -> "3G"
                    TelephonyManager.NETWORK_TYPE_EDGE,
                    TelephonyManager.NETWORK_TYPE_GPRS -> "2G"
                    else -> null
                }
            } else null
            result.putString("cellType", cellType)

            // ── RSSI / Signal Strength ─────────────────────────────────────
            // getAllCellInfo requires ACCESS_FINE_LOCATION on API ≥ 29.
            // We fall back to a null RSSI if permissions are missing.
            val hasFineLocation = ContextCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED

            var rssi: Int? = null
            if (hasFineLocation && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                val cellInfoList = telephonyManager.allCellInfo
                if (cellInfoList != null) {
                    for (cellInfo in cellInfoList) {
                        when (cellInfo) {
                            is CellInfoLte -> {
                                val dbm = cellInfo.cellSignalStrength.dbm
                                if (dbm != Int.MAX_VALUE) { rssi = dbm; break }
                            }
                            is CellInfoNr -> {
                                val ss = cellInfo.cellSignalStrength as? CellSignalStrengthNr
                                val dbm = ss?.dbm ?: Int.MAX_VALUE
                                if (dbm != Int.MAX_VALUE) { rssi = dbm; break }
                            }
                            is CellInfoWcdma -> {
                                val dbm = cellInfo.cellSignalStrength.dbm
                                if (dbm != Int.MAX_VALUE) { rssi = dbm; break }
                            }
                            is CellInfoGsm -> {
                                val dbm = cellInfo.cellSignalStrength.dbm
                                if (dbm != Int.MAX_VALUE) { rssi = dbm; break }
                            }
                        }
                    }
                }
            }

            if (rssi != null) {
                result.putInt("rssi", rssi)
            } else {
                result.putNull("rssi")
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("CELLULAR_INFO_ERROR", e.message, e)
        }
    }
}
