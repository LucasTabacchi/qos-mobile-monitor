#import <React/RCTBridgeModule.h>

// Objective-C bridge macro that exposes the Swift class to RN
@interface RCT_EXTERN_MODULE(CellularInfoModule, NSObject)

RCT_EXTERN_METHOD(getCellularInfo:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup;

@end
