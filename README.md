# Post-it PWA

Une application de gestion de tâches simple et 100% hors-ligne pour mobile, développée avec Nuxt 4, Pinia et VueUse.

## Lancer le projet en développement

1. Installez les dépendances :
   ```bash
   npm install
   ```
2. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```
   L'application sera disponible sur `http://localhost:3000`.

## Build pour la Production (PWA)

Pour tester la version finale (PWA, Service Worker, Manifest), vous devez builder le projet puis le prévisualiser.

```bash
npm run build
npm run preview
```
Vous pourrez ensuite y accéder depuis votre navigateur. En mode production, l'application met en cache ses ressources pour fonctionner entièrement hors-ligne (Offline-first).

## Installer la PWA sur Mobile

L'application est conçue pour être installée directement sur l'écran d'accueil du téléphone, agissant comme une application native.

### Sur Android (Chrome)
1. Ouvrez l'application web dans Chrome.
2. Une bannière "Ajouter à l'écran d'accueil" peut s'afficher en bas. Sinon, appuyez sur le bouton Menu (3 petits points en haut à droite).
3. Sélectionnez "Ajouter à l'écran d'accueil" ou "Installer l'application".
4. Confirmez l'installation. L'application apparaîtra avec les autres applications.

### Sur iOS (Safari)
1. Ouvrez l'application web dans Safari.
2. Appuyez sur le bouton de Partage (le carré avec une flèche pointant vers le haut, en bas de l'écran).
3. Faites défiler les options et choisissez "Sur l'écran d'accueil".
4. Appuyez sur "Ajouter". L'icône de l'application sera ajoutée à votre écran.

---

## 📱 Note pour une future version native (APK / iOS App)

Si vous souhaitez un jour obtenir une véritable application native (APK ou bundle iOS) au lieu d'une PWA :
1. Vous pourrez utiliser **Capacitor** (par Ionic).
2. Il suffira d'ajouter Capacitor au projet : `npm i @capacitor/core` et `npm i -D @capacitor/cli`.
3. Initialiser Capacitor : `npx cap init`.
4. Générer le projet Nuxt en mode statique (SSG) avec `npm run generate`.
5. Synchroniser avec Capacitor : `npx cap sync`.
6. Compiler pour Android/iOS via Android Studio ou Xcode.
*(Ceci n'est pas implémenté dans cette version, mais l'architecture actuelle est 100% compatible).*
