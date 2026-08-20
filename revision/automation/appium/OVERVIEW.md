# Appium — overview & best practices

**Architecture:** [framework-design §5](../../framework-design/NOTES.md#5-mobile--appium-architecture)  
**Q&A:** [INTERVIEW-QA.md](INTERVIEW-QA.md)

## Stack

```text
Test → Appium client → Appium Server → UiAutomator2/XCUITest → Device
```

## Best practices

- Screen Object Model (like POM)  
- Explicit waits (`WebDriverWait`)  
- Capabilities factory per platform  
- Reset app or deep link to starting state  
- Handle permissions dialogs in setup  
- Context switch for WebView hybrid  
- Cloud farm (BS/Sauce) for device matrix  
- One session per device — queue if needed  

## Platform notes

| | Android | iOS |
| --- | --- | --- |
| Driver | UiAutomator2 | XCUITest |
| Tooling | ADB, APK | Xcode, provisioning |
| CI | Emulator common | Simulator; real device nightly |

## Avoid

- Same locators across iOS/Android without abstraction  
- Long chains without wait  
- Shared device state between parallel tests  
