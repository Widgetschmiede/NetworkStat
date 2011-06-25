//
//	SystemConfigurationPlugin.m
//	SystemConfiguration
//
//	Created by Sebastian Krauß on 16.10.06.
//	Copyright 2006 Widgetschmiede. All rights reserved.
//

#import "SystemConfigurationPlugin.h"
#import <SystemConfiguration/SystemConfiguration.h>
#import <Message/NSMailDelivery.h>


@implementation SystemConfigurationPlugin

+ (BOOL)isSelectorExcludedFromWebScript:(SEL)aSel
{
	if (aSel == @selector(nameOfActiveConfiguration)) return NO;
	if (aSel == @selector(namesOfAllConfigurations)) return NO;
	if (aSel == @selector(IDOfConfigurationNamed:)) return NO;
	if (aSel == @selector(isMailConfigured)) return NO;
	if (aSel == @selector(sendMail:to:subj:)) return NO;
	if (aSel == @selector(copyStringToClipboard:)) return NO;
	return YES;
	
	// [self SCPreferences];
	// equals
	// [self performSelector:@selector(SCPreferences)];
}	 

+ (NSString*)webScriptNameForSelector:(SEL)aSel
{
	NSString *retval = nil;
	
	if (aSel == @selector(nameOfActiveConfiguration)) retval = @"nameOfActiveConfiguration";
	else if (aSel == @selector(namesOfAllConfigurations)) retval = @"namesOfAllConfigurations";
	else if (aSel == @selector(IDOfConfigurationNamed:)) retval = @"IDOfConfigurationNamed";
	else if (aSel == @selector(isMailConfigured)) retval = @"isMailConfigured";
	else if (aSel == @selector(sendMail:to:subj:)) retval = @"sendMail";
	else if (aSel == @selector(copyStringToClipboard:)) retval = @"copyStringToClipboard";
	
	return retval;
}

- (id)initWithWebView:(WebView*)webview
{
	self = [super init];
	if (nil == self) return nil;

	[[[NSWorkspace sharedWorkspace] notificationCenter] addObserver:self selector:@selector(wokeUpFromSleep:) name:NSWorkspaceDidWakeNotification object:nil];
	
	return self;
}

- (void)wokeUpFromSleep:(NSNotification*)notif
{
	[scriptObject callWebScriptMethod:@"wokeFromSleep" withArguments:nil];
}

- (void)windowScriptObjectAvailable:(WebScriptObject *)windowScriptObject
{
	scriptObject = [windowScriptObject retain];
	[windowScriptObject setValue:self forKey:@"SystemConfigurationPlugin"];
}

- (SCPreferencesRef)SCPreferences
{
	return SCPreferencesCreate(nil, CFSTR("SystemConfigurationPlugin"), nil);
}

- (NSString*)nameOfActiveConfiguration
{
	SCPreferencesRef gPrefsRef = [self SCPreferences];
	if (nil == gPrefsRef) return nil;

	CFStringRef currentSet = SCPreferencesGetValue(gPrefsRef, kSCPrefCurrentSet);
	if (nil == currentSet) return nil;
	
	CFDictionaryRef setDict = SCPreferencesPathGetValue(gPrefsRef, currentSet);
	if (nil == setDict) return nil;
	
	return (NSString*)CFDictionaryGetValue(setDict, kSCPropUserDefinedName);
}

- (NSArray*)namesOfAllConfigurations
{
	SCPreferencesRef gPrefsRef = [self SCPreferences];
	if (nil == gPrefsRef) return nil;
	
	CFDictionaryRef sets = SCPreferencesGetValue(gPrefsRef, kSCPrefSets);
	if (nil == sets) return nil;
	
	NSArray *keys = [(NSDictionary*)sets allKeys];
	
	NSMutableArray *result = [NSMutableArray array];
	unsigned int i;
	for (i = 0; i < [keys count]; i++)
	{
		NSString *locationName = [(NSDictionary*)[(NSDictionary*)sets objectForKey:[keys objectAtIndex:i]] objectForKey:(NSString*)kSCPropUserDefinedName];
		if (nil != locationName) [result addObject:locationName];
	}
	return result;
}

- (NSString*)IDOfConfigurationNamed:(NSString*)name
{
	NSString *result = nil;
	
	SCPreferencesRef gPrefsRef = [self SCPreferences];
	if (nil == gPrefsRef) return nil;

	CFDictionaryRef sets = SCPreferencesGetValue(gPrefsRef, kSCPrefSets);
	if (nil == sets) return nil;
	
	NSArray *keys = [(NSDictionary*)sets allKeys];
	
	unsigned int i;
	for (i = 0; i < [keys count]; i++)
	{
		NSString *locationName = [(NSDictionary*)[(NSDictionary*)sets objectForKey:[keys objectAtIndex:i]] objectForKey:(NSString*)kSCPropUserDefinedName];
		if ([locationName isEqualToString:name])
		{
			result = [keys objectAtIndex:i];
			break;
		}
	}
	return result;
}

- (BOOL)isMailConfigured
{
	Class mailDelivery = NSClassFromString(@"NSMailDelivery");
	if (mailDelivery) {
		return [mailDelivery hasDeliveryClassBeenConfigured];
	}
	return NO;
}


- (BOOL)sendMail:(NSString*)message to:(NSString*)addresses subj:(NSString*)subject
{
	/*NSMutableDictionary *headers = [NSMutableDictionary dictionary];		// equals [[[NSMutableDictionary alloc] init] autorelease]
	NSAttributedString *myMessage = [[[NSAttributedString alloc] initWithString:message] autorelease];
	
	[headers setObject:addresses forKey:@"to"];
	[headers setObject:subject forKey:@"subject"];
        [headers setObject:NSFullUserName() forKey:@"from"];
	[headers setObject:@"text/plain; charset=UTF-8; format=flowed" forKey:@"Content-Type"];
	//[headers setObject:@"1.0" forKey:@"Mime-Version"];
	[headers setObject:@"NetworkStat Widget" forKey:@"X-Mailer"];
	
	return [NSMailDelivery deliverMessage:myMessage headers:headers format:NSASCIIMailFormat protocol:nil];*/
	NSArray *myAddresses = [addresses componentsSeparatedByString:@" "];
	
	NSMutableString *myMessage = [[message mutableCopy] autorelease];
	[myMessage replaceOccurrencesOfString:@"HOSTNAME" withString:[[[[NSHost currentHost] name] componentsSeparatedByString:@"."] objectAtIndex:0] options:0 range:NSMakeRange(0, [message length])];
	
	BOOL check = YES;
	unsigned int i;
	Class mailDelivery = NSClassFromString(@"NSMailDelivery");
	if (!mailDelivery) {
		NSLog(@"NSMailDelivery Class is not availably on your system, it's not possible to send emails");
		return NO;
	}
	
	for (i = 0; i < [myAddresses count]; i++) {
    	if(![mailDelivery deliverMessage:myMessage subject:subject to:[myAddresses objectAtIndex:i]]) {
    		check = NO;
    	}
    }
    
    return check;
}


- (void)copyStringToClipboard:(NSString*)string
{
	NSPasteboard *pb = [NSPasteboard generalPasteboard];
	[pb declareTypes:[NSArray arrayWithObject:NSStringPboardType] owner:nil];
	[pb setString:string forType:NSStringPboardType];
}



@end
