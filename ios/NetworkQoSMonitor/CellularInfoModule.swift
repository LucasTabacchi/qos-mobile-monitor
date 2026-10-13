import Foundation
import CoreTelephony
import React

/**
 * CellularInfoModule (iOS)
 *
 * Exposes cellular signal info to React Native via Native Module.
 * CoreTelephony is very restricted on iOS — RSSI is NOT accessible without
 * a private entitlement. What IS available:
 *   - Carrier name (CTCarrier.carrierName)
 *   - Radio access technology (CTTelephonyNetworkInfo.currentRadioAccessTechnology)
 *
 * RSSI on iOS:
 *   Apple does not expose RSSI through any public API. The signal bars shown
 *   in the status bar are an internal metric. This module returns null for RSSI
 *   to maintain API shape parity with Android.
 *
 * iOS permissions: no extra plist keys needed for carrier info.
 */
@objc(CellularInfoModule)
class CellularInfoModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool { return false }

  @objc
  func getCellularInfo(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    let networkInfo = CTTelephonyNetworkInfo()

    var operatorName: String? = nil
    var cellType: String? = nil

    if #available(iOS 13.0, *) {
      // Use the current service (first SIM)
      if let serviceSubscriberCellularProviders = networkInfo.serviceSubscriberCellularProviders,
         let provider = serviceSubscriberCellularProviders.values.first {
        operatorName = provider.carrierName
      }
      if let radioTech = networkInfo.serviceCurrentRadioAccessTechnology?.values.first {
        cellType = radioAccessTechToString(radioTech)
      }
    } else {
      operatorName = networkInfo.subscriberCellularProvider?.carrierName
      if let radioTech = networkInfo.currentRadioAccessTechnology {
        cellType = radioAccessTechToString(radioTech)
      }
    }

    let result: [String: Any?] = [
      // RSSI is not available through public iOS APIs
      "rssi": nil,
      "operator": operatorName,
      "cellType": cellType,
    ]

    // Filter out nil values to match JS expectations
    let filtered = result.compactMapValues { $0 }
    resolve(filtered)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private func radioAccessTechToString(_ tech: String) -> String {
    switch tech {
    case CTRadioAccessTechnologyNRNSA,
         CTRadioAccessTechnologyNR:
      return "5G"
    case CTRadioAccessTechnologyLTE:
      return "LTE"
    case CTRadioAccessTechnologyWCDMA,
         CTRadioAccessTechnologyHSDPA,
         CTRadioAccessTechnologyHSUPA,
         CTRadioAccessTechnologyCDMAEVDORev0,
         CTRadioAccessTechnologyCDMAEVDORevA,
         CTRadioAccessTechnologyCDMAEVDORevB,
         CTRadioAccessTechnologyeHRPD:
      return "3G"
    case CTRadioAccessTechnologyEdge,
         CTRadioAccessTechnologyGPRS,
         CTRadioAccessTechnologyCDMA1x:
      return "2G"
    default:
      return "UNKNOWN"
    }
  }
}
