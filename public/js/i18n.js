(function () {
  const STORAGE_KEY = "uiLanguage";

  const messages = {
    en: {
      "nav.nowPlaying": "Now Playing",
      "nav.home": "Home",
      "nav.live": "Live TV",
      "nav.guide": "TV Guide",
      "nav.movies": "Movies",
      "nav.series": "Series",
      "nav.settings": "Settings",
      "nav.logout": "Logout",

      "common.language": "Language",
      "common.allSources": "All Sources",
      "common.allGroups": "All Groups",
      "common.allCategories": "All Categories",
      "common.searchChannels": "Search channels...",
      "common.searchMovies": "Search movies...",
      "common.searchSeries": "Search series...",
      "common.clearSearch": "Clear search",
      "common.favorites": "Favorites",
      "common.addToFavorites": "Add to Favorites",
      "common.removeFromFavorites": "Remove from Favorites",
      "common.channels": "Channels",
      "common.cancel": "Cancel",
      "common.saveChanges": "Save Changes",
      "common.loading": "Loading...",
      "common.unknown": "Unknown",
      "common.proceed": "Proceed",
      "common.proceedAnyway": "Proceed Anyway",
      "common.name": "Name",
      "common.url": "URL",
      "common.enable": "Enable",
      "common.disable": "Disable",
      "common.edit": "Edit",
      "common.delete": "Delete",
      "common.done": "Done",
      "common.saving": "Saving...",
      "common.noChanges": "No changes",
      "common.saved": "Saved!",
      "common.failedWithMessage": "Failed: {message}",
      "common.watch": "Watch",
      "common.trailer": "Trailer",
      "common.moreInfo": "More Info",

      "channels.noMatch": "No channels match your search",
      "channels.noLoaded": "No channels loaded",
      "channels.tryDifferent": "Try a different search term",
      "channels.addSourceHint": "Add a source in Settings to get started",

      "live.schedule": "Live TV Schedule",
      "live.title": "Live TV",
      "live.selectChannel": "Select a channel",
      "live.selectChannelProgramme":
        "Select a channel to show current programme",
      "live.groupPrefix": "Group",
      "live.noEpg": "No EPG data",
      "live.onAir": "ON AIR",
      "live.upNext": "Up Next",
      "live.noChannelSelected": "No channel selected",

      "guide.title": "TV Guide",
      "guide.earlier": "Earlier",
      "guide.later": "Later",
      "guide.today": "Today",
      "guide.noData": "No EPG data available",
      "guide.addSourceHint": "Add an EPG source in Settings",

      "movies.loading": "Loading movies...",
      "movies.noFound": "No movies found",
      "movies.errorLoading": "Error loading movies",
      "movies.favoritesOnly": "Show Favorites Only",
      "movies.back": "Back to Movies",
      "preplay.votes": "{count} votes",

      "series.loading": "Loading series...",
      "series.noFound": "No series found",
      "series.errorLoading": "Error loading series",
      "series.favoritesOnly": "Show Favorites Only",
      "series.back": "Back to Series",
      "series.startFirstEpisode": "Start - S01E01",
      "series.noEpisodes": "No episodes found",
      "series.errorEpisodes": "Error loading episodes",
      "series.seasonLabel": "Season",
      "series.episodesLabel": "episodes",
      "series.episodeLabel": "Episode",

      "home.kicker": "Tonight on StreamNet TV",
      "home.title": "Your entertainment command center",
      "home.subtitleLoading": "Loading your personalized highlights...",
      "home.watchLive": "Watch Live TV",
      "home.exploreMovies": "Explore Movies",
      "home.browseSeries": "Browse Series",
      "home.openGuide": "Open TV Guide",
      "home.continueWatching": "Continue Watching",
      "home.recentMovies": "Recently Added Movies",
      "home.recentSeries": "Recently Added Series",
      "home.favoriteChannels": "Favorite Channels",
      "home.savedCount": "{count} saved",
      "home.loadingFavorites": "Loading favorites...",
      "home.loadingHistory": "Loading history...",
      "home.loadingRecent": "Loading recently added...",
      "home.addFavoritesHint": "Add channels to favorites from Live TV",
      "home.errorFavorites": "Error loading favorites",
      "home.noEpgNow": "No EPG right now",
      "home.playNow": "Play now",
      "home.unknown": "Unknown",
      "home.noRecentMovies": "No recently added movies found",
      "home.noRecentSeries": "No recently added series found",
      "home.movie": "Movie",
      "home.series": "Series",
      "home.continue": "Continue",
      "home.unknownTitle": "Unknown Title",
      "home.greetingMorning": "Good morning",
      "home.greetingAfternoon": "Good afternoon",
      "home.greetingEvening": "Good evening",
      "home.heroSummary":
        "{greeting}. {favorites} favorites, {history} in-progress, {titles} titles in your library.",

      "settings.title": "Settings",
      "settings.sources": "Sources",
      "settings.player": "Player",
      "settings.transcoding": "Transcoding",
      "settings.manageContent": "Manage Content",
      "settings.users": "Users",
      "settings.language": "Language",
      "settings.recommendedEncoder": "Recommended encoder",
      "settings.noGpuDetected":
        "No GPU acceleration detected. Using software encoding.",
      "settings.failedLoadHw": "Failed to load hardware info",
      "settings.syncNotRunYet": "Sync has not run yet since server started",
      "settings.syncStatusUnavailable": "Could not fetch sync status",
      "settings.xtreamConnections": "Xtream Connections",
      "settings.m3uPlaylists": "M3U Playlists",
      "settings.epgSources": "EPG Sources",
      "settings.addXtream": "+ Add Xtream",
      "settings.addM3u": "+ Add M3U",
      "settings.addEpg": "+ Add EPG",
      "settings.epgDataSettings": "EPG Data Settings",
      "settings.autoRefreshEpg": "Auto-refresh EPG data every:",
      "settings.lastRefreshed": "Last Refreshed:",
      "settings.keyboardControls": "Keyboard Controls",
      "settings.nowPlayingOverlay": "Now Playing Overlay",
      "settings.displayDurationSeconds": "Display Duration (seconds)",
      "settings.volumeSettings": "Volume Settings",
      "settings.defaultVolume": "Default Volume",
      "settings.playback": "Playback",
      "settings.keyboardShortcuts": "Keyboard Shortcuts",
      "settings.detectedHardware": "Detected Hardware",
      "settings.encoderSettings": "Encoder Settings",
      "settings.upscaling": "Upscaling",
      "settings.streamProcessing": "Stream Processing",
      "settings.httpSettings": "HTTP Settings",
      "settings.network": "Network",
      "settings.userManagement": "User Management",
      "settings.manageUsersPermissions": "Manage user accounts and permissions",
      "settings.addNewUser": "Add New User",
      "settings.heroEyebrow": "StreamNet TV · Settings",
      "settings.heroTitle": "Settings",
      "settings.heroDescription":
        "Fine-tune sources, playback, transcoding, and content tools in one focused control center.",
      "settings.heroStatVersion": "App version",
      "settings.heroStatRuntime": "Runtime baseline",
      "settings.heroStatAuth": "Authentication",

      "users.username": "Username",
      "users.password": "Password",
      "users.role": "Role",
      "users.viewer": "Viewer",
      "users.admin": "Admin",
      "users.editUser": "Edit User",
      "users.newPassword": "New Password",
      "users.email": "Email",
      "users.created": "Created",
      "users.actions": "Actions",
      "users.createdSuccess": "User created successfully!",
      "users.errorCreate": "Error creating user: {message}",
      "users.noneFound": "No users found",
      "users.edit": "Edit",
      "users.delete": "Delete",
      "users.errorLoad": "Error loading users",
      "users.errorModalMissing":
        "Error: Modal not found. Please refresh the page.",
      "users.passwordManagedBySso": "Managed by SSO Provider",
      "users.passwordNoChangeSso": "Password cannot be changed for SSO users.",
      "users.passwordLeaveBlank": "Leave blank to keep current",
      "users.passwordHint": "Optional. Leave blank to keep unchanged.",
      "users.errorOpenModal": "Error opening edit modal: {message}",
      "users.errorUpdate": "Error updating user: {message}",
      "users.confirmDelete":
        'Are you sure you want to delete user "{username}"?',
      "users.errorDelete": "Error deleting user: {message}",
      "users.roleAdmin": "Admin",
      "users.roleViewer": "Viewer",
      "users.loading": "Loading users...",
      "users.noEmailAssociated": "No email associated",

      "sources.noneConfigured": "No {type} sources configured",
      "sources.refreshData": "Refresh Data",
      "sources.testConnection": "Test Connection",
      "sources.addXtreamConnection": "Add Xtream Connection",
      "sources.addM3uPlaylist": "Add M3U Playlist",
      "sources.addEpgSource": "Add EPG Source",
      "sources.addSource": "Add Source",
      "sources.editSource": "Edit {type} Source",
      "sources.mySource": "My Source",
      "sources.serverUrl": "Server URL",
      "sources.nameUrlRequired": "Name and URL are required",
      "sources.largePlaylistWarningTitle": "Large Playlist Warning",
      "sources.largePlaylistWarningMessage":
        "This playlist contains <strong>{count}</strong> channels.",
      "sources.largePlaylistWarningDetails":
        "Syncing may take several minutes and app performance may be impacted with large playlists.<br><br>Consider using a filtered M3U from your provider to include only channels you actually watch.",
      "sources.errorAdding": "Error adding source: {message}",
      "sources.errorUpdating": "Error updating source: {message}",
      "sources.confirmDelete": "Are you sure you want to delete this source?",
      "sources.errorDeleting": "Error deleting source: {message}",
      "sources.errorToggling": "Error toggling source: {message}",
      "sources.connectionSuccessful": "Connection successful!",
      "sources.connectionFailed": "Connection failed: {message}",
      "sources.syncTimedOut": "Sync timed out",
      "sources.epgSynced": "EPG data synced and refreshed!",
      "sources.xtreamSynced": "Xtream data synced and refreshed!",
      "sources.m3uSynced": "M3U playlist synced and refreshed!",
      "sources.refreshFailed": "Refresh failed: {message}",

      "content.selectSource": "Select a source...",
      "content.selectSourceToView": "Select a source to view {typeLabel}",
      "content.errorLoading": "Error loading content",
      "content.noMatches": "No matches found",
      "content.noneFound": "No content found",
      "content.showingAll": "Showing all...",
      "content.hidingAll": "Hiding all...",
      "content.noContentToSave": "No content loaded to save",
      "content.failedSaveChanges": "Failed to save changes: {message}",
      "content.showAll": "Show All",
      "content.hideAll": "Hide All",
      "content.channels": "Channels",
      "content.selectSourceHint": "Select a source to view groups and channels",

      "time.justNow": "Just now",
      "time.minutesAgo": "{count} minutes ago",
      "time.hoursAgo": "{count} hours ago",

      "epg.never": "Never",
    },
    de: {
      "nav.nowPlaying": "Jetzt läuft",
      "nav.home": "Start",
      "nav.live": "Live TV",
      "nav.guide": "TV Guide",
      "nav.movies": "Filme",
      "nav.series": "Serien",
      "nav.settings": "Einstellungen",
      "nav.logout": "Abmelden",

      "common.language": "Sprache",
      "common.allSources": "Alle Quellen",
      "common.allGroups": "Alle Gruppen",
      "common.allCategories": "Alle Kategorien",
      "common.searchChannels": "Sender suchen...",
      "common.searchMovies": "Filme suchen...",
      "common.searchSeries": "Serien suchen...",
      "common.clearSearch": "Suche leeren",
      "common.favorites": "Favoriten",
      "common.addToFavorites": "Zu Favoriten hinzufügen",
      "common.removeFromFavorites": "Aus Favoriten entfernen",
      "common.channels": "Sender",
      "common.cancel": "Abbrechen",
      "common.saveChanges": "Änderungen speichern",
      "common.loading": "Lädt...",
      "common.unknown": "Unbekannt",
      "common.proceed": "Fortfahren",
      "common.proceedAnyway": "Trotzdem fortfahren",
      "common.name": "Name",
      "common.url": "URL",
      "common.enable": "Aktivieren",
      "common.disable": "Deaktivieren",
      "common.edit": "Bearbeiten",
      "common.delete": "Löschen",
      "common.done": "Fertig",
      "common.saving": "Speichert...",
      "common.noChanges": "Keine Änderungen",
      "common.saved": "Gespeichert!",
      "common.failedWithMessage": "Fehlgeschlagen: {message}",
      "common.watch": "Ansehen",
      "common.trailer": "Trailer",
      "common.moreInfo": "Mehr Infos",

      "channels.noMatch": "Keine Sender passen zur Suche",
      "channels.noLoaded": "Keine Sender geladen",
      "channels.tryDifferent": "Versuche einen anderen Suchbegriff",
      "channels.addSourceHint": "Füge in den Einstellungen eine Quelle hinzu",

      "live.schedule": "Live TV Programm",
      "live.title": "Live TV",
      "live.selectChannel": "Sender auswählen",
      "live.selectChannelProgramme":
        "Wähle einen Sender, um das aktuelle Programm zu sehen",
      "live.groupPrefix": "Gruppe",
      "live.noEpg": "Keine EPG-Daten",
      "live.onAir": "LIVE",
      "live.upNext": "Als Nächstes",
      "live.noChannelSelected": "Kein Sender ausgewählt",

      "guide.title": "TV Guide",
      "guide.earlier": "Früher",
      "guide.later": "Später",
      "guide.today": "Heute",
      "guide.noData": "Keine EPG-Daten verfügbar",
      "guide.addSourceHint": "Füge eine EPG-Quelle in den Einstellungen hinzu",

      "movies.loading": "Filme werden geladen...",
      "movies.noFound": "Keine Filme gefunden",
      "movies.errorLoading": "Fehler beim Laden der Filme",
      "movies.favoritesOnly": "Nur Favoriten anzeigen",
      "movies.back": "Zurück zu Filmen",
      "preplay.votes": "{count} Bewertungen",

      "series.loading": "Serien werden geladen...",
      "series.noFound": "Keine Serien gefunden",
      "series.errorLoading": "Fehler beim Laden der Serien",
      "series.favoritesOnly": "Nur Favoriten anzeigen",
      "series.back": "Zurück zu Serien",
      "series.startFirstEpisode": "Beginnen - S01E01",
      "series.noEpisodes": "Keine Episoden gefunden",
      "series.errorEpisodes": "Fehler beim Laden der Episoden",
      "series.seasonLabel": "Staffel",
      "series.episodesLabel": "Episoden",
      "series.episodeLabel": "Episode",

      "home.kicker": "Heute Abend auf StreamNet TV",
      "home.title": "Deine Entertainment-Zentrale",
      "home.subtitleLoading": "Deine persönlichen Highlights werden geladen...",
      "home.watchLive": "Live TV schauen",
      "home.exploreMovies": "Filme entdecken",
      "home.browseSeries": "Serien durchsuchen",
      "home.openGuide": "TV Guide öffnen",
      "home.continueWatching": "Weiterschauen",
      "home.recentMovies": "Kürzlich hinzugefügte Filme",
      "home.recentSeries": "Kürzlich hinzugefügte Serien",
      "home.favoriteChannels": "Lieblingssender",
      "home.savedCount": "{count} gespeichert",
      "home.loadingFavorites": "Favoriten werden geladen...",
      "home.loadingHistory": "Verlauf wird geladen...",
      "home.loadingRecent": "Kürzlich hinzugefügt wird geladen...",
      "home.addFavoritesHint": "Füge Sender in Live TV zu Favoriten hinzu",
      "home.errorFavorites": "Fehler beim Laden der Favoriten",
      "home.noEpgNow": "Gerade keine EPG-Daten",
      "home.playNow": "Jetzt starten",
      "home.unknown": "Unbekannt",
      "home.noRecentMovies": "Keine kürzlich hinzugefügten Filme gefunden",
      "home.noRecentSeries": "Keine kürzlich hinzugefügten Serien gefunden",
      "home.movie": "Film",
      "home.series": "Serie",
      "home.continue": "Fortsetzen",
      "home.unknownTitle": "Unbekannter Titel",
      "home.greetingMorning": "Guten Morgen",
      "home.greetingAfternoon": "Guten Tag",
      "home.greetingEvening": "Guten Abend",
      "home.heroSummary":
        "{greeting}. {favorites} Favoriten, {history} begonnen, {titles} Titel in deiner Bibliothek.",

      "settings.title": "Einstellungen",
      "settings.sources": "Quellen",
      "settings.player": "Player",
      "settings.transcoding": "Transcoding",
      "settings.manageContent": "Inhalte verwalten",
      "settings.users": "Benutzer",
      "settings.language": "Sprache",
      "settings.recommendedEncoder": "Empfohlener Encoder",
      "settings.noGpuDetected":
        "Keine GPU-Beschleunigung erkannt. Software-Encoding wird verwendet.",
      "settings.failedLoadHw":
        "Hardware-Informationen konnten nicht geladen werden",
      "settings.syncNotRunYet":
        "Seit Serverstart wurde noch kein Sync ausgeführt",
      "settings.syncStatusUnavailable":
        "Sync-Status konnte nicht geladen werden",
      "settings.xtreamConnections": "Xtream-Verbindungen",
      "settings.m3uPlaylists": "M3U-Playlists",
      "settings.epgSources": "EPG-Quellen",
      "settings.addXtream": "+ Xtream hinzufügen",
      "settings.addM3u": "+ M3U hinzufügen",
      "settings.addEpg": "+ EPG hinzufügen",
      "settings.epgDataSettings": "EPG-Daten Einstellungen",
      "settings.autoRefreshEpg": "EPG-Daten automatisch aktualisieren alle:",
      "settings.lastRefreshed": "Zuletzt aktualisiert:",
      "settings.keyboardControls": "Tastatursteuerung",
      "settings.nowPlayingOverlay": "Now-Playing-Overlay",
      "settings.displayDurationSeconds": "Anzeigedauer (Sekunden)",
      "settings.volumeSettings": "Lautstärke",
      "settings.defaultVolume": "Standardlautstärke",
      "settings.playback": "Wiedergabe",
      "settings.keyboardShortcuts": "Tastenkürzel",
      "settings.detectedHardware": "Erkannte Hardware",
      "settings.encoderSettings": "Encoder-Einstellungen",
      "settings.upscaling": "Upscaling",
      "settings.streamProcessing": "Stream-Verarbeitung",
      "settings.httpSettings": "HTTP-Einstellungen",
      "settings.network": "Netzwerk",
      "settings.userManagement": "Benutzerverwaltung",
      "settings.manageUsersPermissions":
        "Benutzerkonten und Berechtigungen verwalten",
      "settings.addNewUser": "Neuen Benutzer hinzufügen",
      "settings.heroEyebrow": "StreamNet TV · Einstellungen",
      "settings.heroTitle": "Einstellungen",
      "settings.heroDescription":
        "Passe Quellen, Wiedergabe, Transcoding und Content-Tools in einem zentralen Kontrollbereich an.",
      "settings.heroStatVersion": "App-Version",
      "settings.heroStatRuntime": "Runtime-Basis",
      "settings.heroStatAuth": "Authentifizierung",

      "users.username": "Benutzername",
      "users.password": "Passwort",
      "users.role": "Rolle",
      "users.viewer": "Viewer",
      "users.admin": "Admin",
      "users.editUser": "Benutzer bearbeiten",
      "users.newPassword": "Neues Passwort",
      "users.email": "E-Mail",
      "users.created": "Erstellt",
      "users.actions": "Aktionen",
      "users.createdSuccess": "Benutzer erfolgreich erstellt!",
      "users.errorCreate": "Fehler beim Erstellen des Benutzers: {message}",
      "users.noneFound": "Keine Benutzer gefunden",
      "users.edit": "Bearbeiten",
      "users.delete": "Löschen",
      "users.errorLoad": "Fehler beim Laden der Benutzer",
      "users.errorModalMissing":
        "Fehler: Modal nicht gefunden. Bitte Seite neu laden.",
      "users.passwordManagedBySso": "Wird vom SSO-Anbieter verwaltet",
      "users.passwordNoChangeSso":
        "Passwort kann für SSO-Benutzer nicht geändert werden.",
      "users.passwordLeaveBlank": "Leer lassen, um aktuelles zu behalten",
      "users.passwordHint": "Optional. Leer lassen, um unverändert zu lassen.",
      "users.errorOpenModal":
        "Fehler beim Öffnen des Bearbeiten-Dialogs: {message}",
      "users.errorUpdate": "Fehler beim Aktualisieren des Benutzers: {message}",
      "users.confirmDelete":
        'Möchtest du den Benutzer "{username}" wirklich löschen?',
      "users.errorDelete": "Fehler beim Löschen des Benutzers: {message}",
      "users.roleAdmin": "Admin",
      "users.roleViewer": "Viewer",
      "users.loading": "Benutzer werden geladen...",
      "users.noEmailAssociated": "Keine E-Mail verknüpft",

      "sources.noneConfigured": "Keine {type}-Quellen konfiguriert",
      "sources.refreshData": "Daten aktualisieren",
      "sources.testConnection": "Verbindung testen",
      "sources.addXtreamConnection": "Xtream-Verbindung hinzufügen",
      "sources.addM3uPlaylist": "M3U-Playlist hinzufügen",
      "sources.addEpgSource": "EPG-Quelle hinzufügen",
      "sources.addSource": "Quelle hinzufügen",
      "sources.editSource": "{type}-Quelle bearbeiten",
      "sources.mySource": "Meine Quelle",
      "sources.serverUrl": "Server-URL",
      "sources.nameUrlRequired": "Name und URL sind erforderlich",
      "sources.largePlaylistWarningTitle": "Warnung: Große Playlist",
      "sources.largePlaylistWarningMessage":
        "Diese Playlist enthält <strong>{count}</strong> Sender.",
      "sources.largePlaylistWarningDetails":
        "Der Sync kann mehrere Minuten dauern und große Playlists können die Performance beeinträchtigen.<br><br>Nutze idealerweise eine gefilterte M3U mit nur den Sendern, die du wirklich schaust.",
      "sources.errorAdding": "Fehler beim Hinzufügen der Quelle: {message}",
      "sources.errorUpdating":
        "Fehler beim Aktualisieren der Quelle: {message}",
      "sources.confirmDelete": "Möchtest du diese Quelle wirklich löschen?",
      "sources.errorDeleting": "Fehler beim Löschen der Quelle: {message}",
      "sources.errorToggling": "Fehler beim Umschalten der Quelle: {message}",
      "sources.connectionSuccessful": "Verbindung erfolgreich!",
      "sources.connectionFailed": "Verbindung fehlgeschlagen: {message}",
      "sources.syncTimedOut": "Sync-Zeitüberschreitung",
      "sources.epgSynced": "EPG-Daten wurden synchronisiert und aktualisiert!",
      "sources.xtreamSynced":
        "Xtream-Daten wurden synchronisiert und aktualisiert!",
      "sources.m3uSynced":
        "M3U-Playlist wurde synchronisiert und aktualisiert!",
      "sources.refreshFailed": "Aktualisierung fehlgeschlagen: {message}",

      "content.selectSource": "Quelle auswählen...",
      "content.selectSourceToView":
        "Quelle auswählen, um {typeLabel} anzuzeigen",
      "content.errorLoading": "Fehler beim Laden der Inhalte",
      "content.noMatches": "Keine Treffer gefunden",
      "content.noneFound": "Keine Inhalte gefunden",
      "content.showingAll": "Alle werden angezeigt...",
      "content.hidingAll": "Alle werden ausgeblendet...",
      "content.noContentToSave": "Keine Inhalte zum Speichern geladen",
      "content.failedSaveChanges":
        "Fehler beim Speichern der Änderungen: {message}",
      "content.showAll": "Alle anzeigen",
      "content.hideAll": "Alle ausblenden",
      "content.channels": "Sender",
      "content.selectSourceHint":
        "Wähle eine Quelle, um Gruppen und Sender zu sehen",

      "time.justNow": "Gerade eben",
      "time.minutesAgo": "vor {count} Minuten",
      "time.hoursAgo": "vor {count} Stunden",

      "epg.never": "Nie",
    },
  };

  const fallbackLang = "de";

  const state = {
    lang: localStorage.getItem(STORAGE_KEY) || fallbackLang,
  };

  function template(str, params = {}) {
    return String(str).replace(/\{(\w+)\}/g, (_, k) =>
      params[k] !== undefined ? String(params[k]) : `{${k}}`,
    );
  }

  function t(key, params = {}) {
    const dict = messages[state.lang] || messages.en;
    const fallback = messages.en || {};
    const raw = dict[key] ?? fallback[key] ?? key;
    return template(raw, params);
  }

  function setText(selector, key, params) {
    const el = document.querySelector(selector);
    if (el) el.textContent = t(key, params);
  }

  function setTextAll(selector, key, params) {
    document.querySelectorAll(selector).forEach((el) => {
      el.textContent = t(key, params);
    });
  }

  function setPlaceholder(selector, key) {
    const el = document.querySelector(selector);
    if (el) el.placeholder = t(key);
  }

  function setTitle(selector, key) {
    const el = document.querySelector(selector);
    if (el) el.title = t(key);
  }

  function setLabelByFor(forId, key) {
    const el = document.querySelector(`label[for="${forId}"]`);
    if (el) el.textContent = t(key);
  }

  function setButtonLabelKeepingIcon(selector, key) {
    const btn = document.querySelector(selector);
    if (!btn) return;

    const icon = btn.querySelector("svg");
    if (!icon) {
      btn.textContent = t(key);
      return;
    }

    const existingLabel = btn.querySelector(".btn-label");
    if (existingLabel) {
      existingLabel.textContent = t(key);
      return;
    }

    Array.from(btn.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        node.remove();
      }
    });

    const label = document.createElement("span");
    label.className = "btn-label";
    label.textContent = t(key);
    btn.appendChild(label);
  }

  function setOptionByValue(selectId, value, key) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const opt = Array.from(select.options).find((o) => o.value === value);
    if (opt) opt.textContent = t(key);
  }

  function applyDomTranslations() {
    document.documentElement.lang = state.lang;

    const settingsLangSelect = document.getElementById(
      "settings-language-select",
    );
    if (settingsLangSelect) {
      settingsLangSelect.value = state.lang;
    }

    setText("#now-playing-text", "nav.nowPlaying");
    setText('.nav-link[data-page="home"] span:last-child', "nav.home");
    setText('.nav-link[data-page="live"] span:last-child', "nav.live");
    setText('.nav-link[data-page="guide"] span:last-child', "nav.guide");
    setText('.nav-link[data-page="movies"] span:last-child', "nav.movies");
    setText('.nav-link[data-page="series"] span:last-child', "nav.series");
    setText('.nav-link[data-page="settings"] span:last-child', "nav.settings");
    setText("#logout-btn span:last-child", "nav.logout");

    setText("#language-label", "common.language");
    setText("#channel-toggle-btn span", "common.channels");
    setPlaceholder("#channel-search", "common.searchChannels");
    setTitle("#channel-sidebar .search-clear", "common.clearSearch");

    setOptionByValue("source-select", "", "common.allSources");
    setOptionByValue("epg-group-select", "", "common.allGroups");
    setOptionByValue("movies-source-select", "", "common.allSources");
    setOptionByValue("movies-category-select", "", "common.allCategories");
    setOptionByValue("series-source-select", "", "common.allSources");
    setOptionByValue("series-category-select", "", "common.allCategories");

    setText("#page-guide .guide-header h2", "guide.title");
    setPlaceholder("#epg-search", "common.searchChannels");
    setTitle("#page-guide .search-clear", "common.clearSearch");
    setText("#guide-prev", "guide.earlier");
    setText("#guide-next", "guide.later");
    setText("#guide-date", "guide.today");

    setText("#page-movies .movies-header h2", "nav.movies");
    setPlaceholder("#movies-search", "common.searchMovies");
    setTitle("#page-movies .search-clear", "common.clearSearch");
    setButtonLabelKeepingIcon("#movies-favorites-btn", "common.favorites");
    setTitle("#movies-favorites-btn", "movies.favoritesOnly");
    setText("#movies-preplay-back", "movies.back");
    setButtonLabelKeepingIcon("#movies-preplay-play", "common.watch");
    setButtonLabelKeepingIcon("#movies-preplay-trailer", "common.trailer");
    setButtonLabelKeepingIcon(
      "#movies-preplay-favorite",
      "common.addToFavorites",
    );
    setButtonLabelKeepingIcon("#movies-preplay-moreinfo", "common.moreInfo");

    setText("#page-series .series-header h2", "nav.series");
    setPlaceholder("#series-search", "common.searchSeries");
    setTitle("#page-series .search-clear", "common.clearSearch");
    setButtonLabelKeepingIcon("#series-favorites-btn", "common.favorites");
    setTitle("#series-favorites-btn", "series.favoritesOnly");
    setText(".series-back-btn", "series.back");
    setButtonLabelKeepingIcon(
      "#series-preplay-play",
      "series.startFirstEpisode",
    );
    setButtonLabelKeepingIcon("#series-preplay-trailer", "common.trailer");
    setButtonLabelKeepingIcon(
      "#series-preplay-favorite",
      "common.addToFavorites",
    );
    setButtonLabelKeepingIcon("#series-preplay-moreinfo", "common.moreInfo");

    setText(
      "#page-settings .settings-hero .settings-eyebrow",
      "settings.heroEyebrow",
    );
    setText("#page-settings .settings-hero h2", "settings.heroTitle");
    setText(
      "#page-settings .settings-hero .settings-hero-line",
      "settings.heroDescription",
    );
    setText(
      "#page-settings .settings-hero .settings-stat-card:nth-child(1) .settings-stat-label",
      "settings.heroStatVersion",
    );
    setText(
      "#page-settings .settings-hero .settings-stat-card:nth-child(2) .settings-stat-label",
      "settings.heroStatRuntime",
    );
    setText(
      "#page-settings .settings-hero .settings-stat-card:nth-child(3) .settings-stat-label",
      "settings.heroStatAuth",
    );
    setText('.settings-nav .tab[data-tab="sources"]', "settings.sources");
    setText('.settings-nav .tab[data-tab="language"]', "settings.language");
    setText('.settings-nav .tab[data-tab="player"]', "settings.player");
    setText('.settings-nav .tab[data-tab="transcode"]', "settings.transcoding");
    setText('.settings-nav .tab[data-tab="content"]', "settings.manageContent");
    setText("#users-tab", "settings.users");

    setText(
      "#tab-sources .source-section:nth-of-type(1) h3",
      "settings.xtreamConnections",
    );
    setText(
      "#tab-sources .source-section:nth-of-type(2) h3",
      "settings.m3uPlaylists",
    );
    setText(
      "#tab-sources .source-section:nth-of-type(3) h3",
      "settings.epgSources",
    );
    setText("#add-xtream", "settings.addXtream");
    setText("#add-m3u", "settings.addM3u");
    setText("#add-epg", "settings.addEpg");
    setText(
      "#tab-sources .source-section:nth-of-type(4) h3",
      "settings.epgDataSettings",
    );
    setLabelByFor("epg-refresh-interval", "settings.autoRefreshEpg");
    setText(
      "#tab-sources .setting-item .setting-label",
      "settings.lastRefreshed",
    );

    setText(
      "#tab-language .settings-section:nth-of-type(1) h3",
      "settings.language",
    );
    setLabelByFor("settings-language-select", "common.language");
    setText(
      "#tab-player .settings-section:nth-of-type(1) h3",
      "settings.keyboardControls",
    );
    setText(
      "#tab-player .settings-section:nth-of-type(2) h3",
      "settings.nowPlayingOverlay",
    );
    setLabelByFor(
      "setting-overlay-duration",
      "settings.displayDurationSeconds",
    );
    setText(
      "#tab-player .settings-section:nth-of-type(3) h3",
      "settings.volumeSettings",
    );
    setLabelByFor("setting-default-volume", "settings.defaultVolume");
    setText(
      "#tab-player .settings-section:nth-of-type(4) h3",
      "settings.playback",
    );
    setText(
      "#tab-player .settings-section:nth-of-type(5) h3",
      "settings.keyboardShortcuts",
    );

    setText(
      "#tab-transcode .settings-section:nth-of-type(1) h3",
      "settings.detectedHardware",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(2) h3",
      "settings.encoderSettings",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(3) h3",
      "settings.upscaling",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(4) h3",
      "settings.streamProcessing",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(5) h3",
      "settings.httpSettings",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(6) h3",
      "settings.network",
    );

    setText("#content-type-channels", "content.channels");
    setText("#content-type-movies", "nav.movies");
    setText("#content-type-series", "nav.series");
    setOptionByValue("content-source-select", "", "content.selectSource");
    setPlaceholder("#content-search", "common.searchChannels");
    setTitle("#tab-content .search-clear", "common.clearSearch");
    setText("#content-show-all", "content.showAll");
    setText("#content-hide-all", "content.hideAll");
    setButtonLabelKeepingIcon("#content-save", "common.saveChanges");
    if (document.querySelector("#content-tree .hint")) {
      const hint = document.querySelector("#content-tree .hint");
      const current = (hint.textContent || "").trim();
      if (
        current === "Select a source to view groups and channels" ||
        current === "Wähle eine Quelle, um Gruppen und Sender zu sehen"
      ) {
        hint.textContent = t("content.selectSourceHint");
      }
    }

    setText("#tab-users .settings-section h3", "settings.userManagement");
    setText(
      "#tab-users .settings-section > p.hint",
      "settings.manageUsersPermissions",
    );
    setText("#tab-users .add-user-section h4", "settings.addNewUser");
    setText("#tab-users th:nth-child(1)", "users.username");
    setText("#tab-users th:nth-child(2)", "users.email");
    setText("#tab-users th:nth-child(3)", "users.role");
    setText("#tab-users th:nth-child(4)", "users.created");
    setText("#tab-users th:nth-child(5)", "users.actions");
    setLabelByFor("new-username", "users.username");
    setLabelByFor("new-password", "users.password");
    setLabelByFor("new-role", "users.role");
    setOptionByValue("new-role", "viewer", "users.viewer");
    setOptionByValue("new-role", "admin", "users.admin");
    setText('#add-user-form button[type="submit"]', "settings.addNewUser");
    setText("#user-list .hint", "users.loading");

    setText("#edit-user-modal .modal-title", "users.editUser");
    setLabelByFor("edit-username", "users.username");
    setLabelByFor("edit-email", "users.email");
    setLabelByFor("edit-role", "users.role");
    setOptionByValue("edit-role", "viewer", "users.viewer");
    setOptionByValue("edit-role", "admin", "users.admin");
    setLabelByFor("edit-password", "users.newPassword");
    setPlaceholder("#edit-email", "users.noEmailAssociated");
    setPlaceholder("#edit-password", "users.passwordLeaveBlank");
    setText("#edit-password-hint", "users.passwordHint");
    setText("#edit-user-cancel", "common.cancel");
    setText("#edit-user-save", "common.saveChanges");

    setText(".live-epg-kicker", "live.schedule");
    if (
      document.getElementById("live-epg-current-title")?.textContent?.trim() ===
      "Live TV"
    ) {
      setText("#live-epg-current-title", "live.title");
    }
    if (document.getElementById("live-epg-current-meta")?.textContent?.trim()) {
      const m = document
        .getElementById("live-epg-current-meta")
        .textContent.trim();
      if (m === "Select a channel" || m === "Sender auswählen") {
        setText("#live-epg-current-meta", "live.selectChannel");
      }
      if (
        m === "Select a channel to show current programme" ||
        m === "Wähle einen Sender, um das aktuelle Programm zu sehen"
      ) {
        setText("#live-epg-current-meta", "live.selectChannelProgramme");
      }
    }

    const epgLast = document.getElementById("epg-last-refreshed");
    if (
      epgLast &&
      (epgLast.textContent || "").trim().toLowerCase() === "never"
    ) {
      epgLast.textContent = t("epg.never");
    }
  }

  function setLanguage(lang) {
    const next = lang === "de" ? "de" : "en";
    if (state.lang === next) return;

    state.lang = next;
    localStorage.setItem(STORAGE_KEY, next);
    applyDomTranslations();

    window.dispatchEvent(
      new CustomEvent("languageChanged", {
        detail: { lang: next },
      }),
    );
  }

  function init() {
    ["settings-language-select", "language-select"].forEach((id) => {
      const select = document.getElementById(id);
      if (!select) return;
      select.value = state.lang;
      select.addEventListener("change", () => setLanguage(select.value));
    });

    applyDomTranslations();
  }

  window.I18n = {
    t,
    init,
    setLanguage,
    applyDomTranslations,
    get language() {
      return state.lang;
    },
  };

  window.t = t;
})();
