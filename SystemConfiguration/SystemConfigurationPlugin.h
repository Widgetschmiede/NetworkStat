//
//  SystemConfigurationPlugin.h
//  SystemConfiguration
//
//  Created by Sebastian Krauß on 16.10.06.
//  Copyright 2006 Widgetschmiede. All rights reserved.
//

#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>


@interface SystemConfigurationPlugin : NSObject {
	WebScriptObject *scriptObject;
}

- (id)initWithWebView:(WebView*)webview;
- (void)wokeUpFromSleep:(NSNotification*)notif;
- (NSString*)nameOfActiveConfiguration;
- (NSArray*)namesOfAllConfigurations;
- (NSString*)IDOfConfigurationNamed:(NSString*)name;
- (void)copyStringToClipboard:(NSString*)string;

- (BOOL)hasMailingPotential;
- (BOOL)isMailConfigured;
- (BOOL)sendMail:(NSString*)message to:(NSString*)addresses subj:(NSString*)subject;


@end
