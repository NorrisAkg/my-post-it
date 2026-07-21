# Implementation Plan - Fix Duplicate Resources

The project fails to build due to duplicate resource names for `splash` in the `drawable` folder: `splash.png` and `splash.xml`. Android does not allow resources of the same name within the same type, even with different extensions.

## Proposed Changes

### Resource Management

#### [NEW] [splash_screen.xml](file:///C:/Users/ky-solutions/projects/persos/post-it/android/app/src/main/res/drawable/splash_screen.xml)
Create a new drawable resource file `splash_screen.xml` with the content currently in `splash.xml`.

#### [DELETE] [splash.xml](file:///C:/Users/ky-solutions/projects/persos/post-it/android/app/src/main/res/drawable/splash.xml)
Remove the original `splash.xml` to resolve the naming conflict with `splash.png`.

#### [MODIFY] [styles.xml](file:///C:/Users/ky-solutions/projects/persos/post-it/android/app/src/main/res/values/styles.xml)
Update the `AppTheme.NoActionBarLaunch` style to use `@drawable/splash_screen` instead of `@drawable/splash`.

## Verification Plan

### Automated Tests
- Run `./gradlew :app:mergeDebugResources` to verify that the resource conflict is resolved and the build task succeeds.
