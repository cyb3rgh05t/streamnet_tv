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
      "live.showGroups": "Groups",
      "live.hideGroups": "Hide Groups",
      "live.openGroupsSidebar": "Open groups sidebar (G)",
      "live.closeGroupsSidebar": "Close groups sidebar (G)",

      "guide.title": "TV Guide",
      "guide.earlier": "Earlier",
      "guide.later": "Later",
      "guide.today": "Today",
      "guide.tomorrow": "Tomorrow",
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
      "home.kickerMorning": "This morning on StreamNet TV",
      "home.kickerNoon": "This noon on StreamNet TV",
      "home.kickerAfternoon": "This afternoon on StreamNet TV",
      "home.kickerEvening": "Tonight on StreamNet TV",
      "home.kickerNight": "Tonight on StreamNet TV",
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
      "settings.loadingHardwareInfo": "Loading hardware information...",
      "settings.hardwareEncoder": "Hardware Encoder",
      "settings.hardwareEncoderHint":
        "Select which GPU encoder to use for transcoding. Auto will use the best available.",
      "settings.encoderAuto": "Auto (Recommended)",
      "settings.maxResolution": "Max Resolution",
      "settings.maxResolutionHint":
        "Limit transcoded output resolution. Lower = faster, more compatible.",
      "settings.qualityPreset": "Quality Preset",
      "settings.qualityPresetHint":
        "Higher quality uses more bandwidth and CPU/GPU.",
      "settings.qualityHigh": "High",
      "settings.qualityMedium": "Medium",
      "settings.qualityLow": "Low (Fastest)",
      "settings.audioMixPreset": "Audio Mix Preset",
      "settings.audioMixPresetHint":
        "How multi-channel audio (5.1/7.1) is mixed down to stereo for browser playback.",
      "settings.audioMixAuto": "Auto (Smart Copy/ITU)",
      "settings.audioMixITU": "ITU-R BS.775 (Balanced)",
      "settings.audioMixNight": "Night Mode (Dialogue Boost)",
      "settings.audioMixCinematic": "Cinematic (Wide)",
      "settings.audioMixPassthrough": "Passthrough (Copy)",
      "settings.upscaleEnabled": "Enable Upscaling",
      "settings.upscaleEnabledHint":
        "Upscale lower-resolution content to a higher resolution during transcoding.",
      "settings.upscaleMethod": "Upscale Method",
      "settings.upscaleMethodHint":
        "Hardware is faster; Software (Lanczos) is higher quality.",
      "settings.upscaleHardware": "Hardware (GPU)",
      "settings.upscaleSoftware": "Software (Lanczos)",
      "settings.upscaleTarget": "Upscale Target",
      "settings.upscaleTargetHint": "Target resolution for upscaled output.",
      "settings.nativeVlcPlayer": "Native VLC Player",
      "settings.nativeVlcHint":
        "Embeds VLC directly into the app window. Zero transcoding - VLC decodes natively with full hardware acceleration. Requires VLC installed on this PC.",
      "settings.autoTranscode": "Auto Transcode (Smart)",
      "settings.autoTranscodeHint":
        "Automatically detect stream codecs and only transcode/remux when needed. Adds ~1-3s probe delay on first play.",
      "settings.forceAudioTranscode": "Force Audio Transcode",
      "settings.forceAudioTranscodeHint":
        "Transcode audio to AAC for browser compatibility. Enable if you get video but no audio (fixes Dolby/AC3/EAC3).",
      "settings.forceVideoTranscode": "Force Video Transcode",
      "settings.forceVideoTranscodeHint":
        "Force full video transcoding (burn-in subtitles, incompatible video). Uses HW encoder.",
      "settings.forceRemux": "Force Remux",
      "settings.forceRemuxHint":
        "Remux streams to MP4 container. Enable for raw .ts streams from IPTV middleware like m3u-editor or dispatcharr.",
      "settings.streamOutputFormat": "Stream Output Format",
      "settings.streamOutputFormatHint":
        "Container format for Xtream streams. Try TS if you experience buffering issues.",
      "settings.streamFormatHls": "HLS (m3u8) - Recommended",
      "settings.streamFormatTs": "MPEG-TS (ts) - Better buffer",
      "settings.userAgent": "User-Agent",
      "settings.userAgentHint":
        "HTTP User-Agent for stream requests. Try VLC if your provider blocks Chrome.",
      "settings.userAgentChrome": "Chrome (Default)",
      "settings.userAgentVlc": "VLC",
      "settings.userAgentTiviMate": "TiviMate",
      "settings.userAgentCustom": "Custom...",
      "settings.customUserAgent": "Custom User-Agent",
      "settings.customUserAgentHint": "Enter your own User-Agent string.",
      "settings.customUserAgentPlaceholder": "Custom User-Agent string...",
      "settings.forceBackendProxy": "Force Backend Proxy",
      "settings.forceBackendProxyHint":
        "Route all streams through the server to bypass CORS restrictions. Enable if streams do not play directly.",
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
      "settings.epgLastRefreshTitle": "EPG Last Refresh",
      "settings.autoRefreshEpg": "Auto-refresh EPG data every:",
      "settings.lastRefreshed": "Last Refreshed:",
      "settings.epgRefreshHint":
        "Use the refresh button next to EPG sources for manual refresh",
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

      "status.vlcNative": "VLC Native",
      "status.transcodingAudio": "Transcoding (Audio)",
      "status.transcodingVideo": "Transcoding (Video)",
      "status.upscaling": "Upscaling",
      "status.remuxAuto": "Remux (Auto)",
      "status.remuxForce": "Remux (Force)",
      "status.directHls": "Direct HLS",
      "status.directNative": "Direct Native",
      "status.directPlay": "Direct Play",

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

      "admin.kicker": "Admin Control",
      "admin.title": "Server Dashboard",
      "admin.subtitle": "Live statistics for server, users, and content.",
      "admin.refreshNow": "Refresh now",
      "admin.refreshing": "Refreshing...",
      "admin.openSettings": "Open settings",
      "admin.uptime": "Uptime",
      "admin.activeSessions": "Active Sessions",
      "admin.totalUsers": "Total Users",
      "admin.contentTotal": "Total Content",
      "admin.enabledSources": "Enabled Sources",
      "admin.trafficLoad": "Traffic Load",
      "admin.watchEvents24h": "Watch Events 24h",
      "admin.userDistribution": "User Distribution",
      "admin.sourceTypes": "Source Types",
      "admin.contentTypes": "Content Types",
      "admin.dailyPeakConcurrent": "Daily Peak Concurrent Streams",
      "admin.historyRange": "History Range",
      "admin.days7": "7 Days",
      "admin.days14": "14 Days",
      "admin.days30": "30 Days",
      "admin.month": "Month",
      "admin.selectMonth": "Select month",
      "admin.monthComparison": "Month Comparison",
      "admin.monthlyPeakTrend": "Monthly Peak Trend",
      "admin.newUsers7d": "New Users (7 Days)",
      "admin.noData": "No data",
      "admin.noHistoryData": "No history data",
      "admin.noMonthlyData": "No monthly data",
      "admin.total": "Total",
      "admin.avgPerDay": "Avg / Day",
      "admin.peak": "Peak",
      "admin.maxPeak": "Max Peak",
      "admin.avgPeak": "Avg Peak",
      "admin.totalEvents": "Total Events",
      "admin.highestPeak": "Highest Peak",
      "admin.lowestPeak": "Lowest Peak",
      "admin.trend": "Trend",
      "admin.current": "Current",
      "admin.previous": "Previous",
      "admin.daysTracked": "Days Tracked",
      "admin.vs": "vs",
      "admin.cpu": "CPU",
      "admin.ram": "RAM",
      "admin.trafficUp": "TRAFFIC UP",
      "admin.trafficDown": "TRAFFIC DOWN",
      "admin.read": "READ",
      "admin.write": "WRITE",
      "admin.notAvailable": "Not available",
      "admin.totalTraffic": "Total Traffic",

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
      "live.showGroups": "Gruppen",
      "live.hideGroups": "Gruppen ausblenden",
      "live.openGroupsSidebar": "Gruppen-Seitenleiste öffnen (G)",
      "live.closeGroupsSidebar": "Gruppen-Seitenleiste schließen (G)",

      "guide.title": "TV Guide",
      "guide.earlier": "Früher",
      "guide.later": "Später",
      "guide.today": "Heute",
      "guide.tomorrow": "Morgen",
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
      "home.kickerMorning": "Heute Morgen auf StreamNet TV",
      "home.kickerNoon": "Heute Mittag auf StreamNet TV",
      "home.kickerAfternoon": "Heute Nachmittag auf StreamNet TV",
      "home.kickerEvening": "Heute Abend auf StreamNet TV",
      "home.kickerNight": "Heute Nacht auf StreamNet TV",
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
      "settings.transcoding": "Transkodierung",
      "settings.manageContent": "Inhalte verwalten",
      "settings.users": "Benutzer",
      "settings.language": "Sprache",
      "settings.loadingHardwareInfo":
        "Hardware-Informationen werden geladen...",
      "settings.hardwareEncoder": "Hardware-Encoder",
      "settings.hardwareEncoderHint":
        "Waehle den GPU-Encoder fuer die Transkodierung. Auto nutzt die beste verfuegbare Option.",
      "settings.encoderAuto": "Auto (Empfohlen)",
      "settings.maxResolution": "Maximale Aufloesung",
      "settings.maxResolutionHint":
        "Begrenze die Ausgabeaufloesung der Transkodierung. Niedriger = schneller, kompatibler.",
      "settings.qualityPreset": "Qualitaetsprofil",
      "settings.qualityPresetHint":
        "Hoehere Qualitaet benoetigt mehr Bandbreite und CPU/GPU.",
      "settings.qualityHigh": "Hoch",
      "settings.qualityMedium": "Mittel",
      "settings.qualityLow": "Niedrig (am schnellsten)",
      "settings.audioMixPreset": "Audio-Mix-Profil",
      "settings.audioMixPresetHint":
        "Wie Mehrkanal-Audio (5.1/7.1) auf Stereo fuer die Browser-Wiedergabe gemischt wird.",
      "settings.audioMixAuto": "Auto (Intelligentes Kopieren/ITU)",
      "settings.audioMixITU": "ITU-R BS.775 (Ausgewogen)",
      "settings.audioMixNight": "Nachtmodus (Dialog-Boost)",
      "settings.audioMixCinematic": "Kino (Breit)",
      "settings.audioMixPassthrough": "Passthrough (Copy)",
      "settings.upscaleEnabled": "Hochskalierung aktivieren",
      "settings.upscaleEnabledHint":
        "Skaliert Inhalte mit niedrigerer Aufloesung waehrend der Transkodierung auf eine hoehere Aufloesung.",
      "settings.upscaleMethod": "Hochskalierungsmethode",
      "settings.upscaleMethodHint":
        "Hardware ist schneller; Software (Lanczos) hat bessere Qualitaet.",
      "settings.upscaleHardware": "Hardware (GPU)",
      "settings.upscaleSoftware": "Software (Lanczos)",
      "settings.upscaleTarget": "Zielaufloesung",
      "settings.upscaleTargetHint":
        "Zielaufloesung fuer hochskalierten Output.",
      "settings.nativeVlcPlayer": "Native VLC-Wiedergabe",
      "settings.nativeVlcHint":
        "Betten VLC direkt ins App-Fenster ein. Keine Transkodierung - VLC dekodiert nativ mit voller Hardwarebeschleunigung. VLC muss auf diesem PC installiert sein.",
      "settings.autoTranscode": "Automatisch transkodieren (Smart)",
      "settings.autoTranscodeHint":
        "Streams automatisch pruefen und Transkodierung/Remux nur bei Bedarf nutzen. Fuegt beim ersten Abspielen ca. 1-3 Sekunden Pruefzeit hinzu.",
      "settings.forceAudioTranscode": "Audio-Transkodierung erzwingen",
      "settings.forceAudioTranscodeHint":
        "Audio fuer Browser-Kompatibilitaet nach AAC transkodieren. Aktivieren, wenn Video aber kein Ton kommt (hilft bei Dolby/AC3/EAC3).",
      "settings.forceVideoTranscode": "Video-Transkodierung erzwingen",
      "settings.forceVideoTranscodeHint":
        "Volle Video-Transkodierung erzwingen (Untertitel einbrennen, inkompatibles Video). Nutzt HW-Encoder.",
      "settings.forceRemux": "Remux erzwingen",
      "settings.forceRemuxHint":
        "Streams in den MP4-Container remuxen. Aktivieren fuer rohe .ts-Streams von IPTV-Middleware wie m3u-editor oder dispatcharr.",
      "settings.streamOutputFormat": "Stream-Ausgabeformat",
      "settings.streamOutputFormatHint":
        "Containerformat fuer Xtream-Streams. Probiere TS, wenn es zu Pufferproblemen kommt.",
      "settings.streamFormatHls": "HLS (m3u8) - Empfohlen",
      "settings.streamFormatTs": "MPEG-TS (ts) - Besserer Puffer",
      "settings.userAgent": "User-Agent",
      "settings.userAgentHint":
        "HTTP User-Agent fuer Stream-Anfragen. Probiere VLC, wenn dein Anbieter Chrome blockiert.",
      "settings.userAgentChrome": "Chrome (Standard)",
      "settings.userAgentVlc": "VLC",
      "settings.userAgentTiviMate": "TiviMate",
      "settings.userAgentCustom": "Benutzerdefiniert...",
      "settings.customUserAgent": "Benutzerdefinierter User-Agent",
      "settings.customUserAgentHint":
        "Gib deinen eigenen User-Agent-String ein.",
      "settings.customUserAgentPlaceholder":
        "Benutzerdefinierter User-Agent-String...",
      "settings.forceBackendProxy": "Backend-Proxy erzwingen",
      "settings.forceBackendProxyHint":
        "Leite alle Streams ueber den Server, um CORS-Einschraenkungen zu umgehen. Aktivieren, wenn Streams nicht direkt abspielen.",
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
      "settings.epgLastRefreshTitle": "EPG Letzte Aktualisierung",
      "settings.autoRefreshEpg": "EPG-Daten automatisch aktualisieren alle:",
      "settings.lastRefreshed": "Zuletzt aktualisiert:",
      "settings.epgRefreshHint":
        "Nutze den Aktualisieren-Button neben den EPG-Quellen fuer einen manuellen Refresh",
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

      "status.vlcNative": "VLC Nativ",
      "status.transcodingAudio": "Transkodierung (Audio)",
      "status.transcodingVideo": "Transkodierung (Video)",
      "status.upscaling": "Hochskalierung",
      "status.remuxAuto": "Remux (Auto)",
      "status.remuxForce": "Remux (Erzwungen)",
      "status.directHls": "Direkt HLS",
      "status.directNative": "Direkt Nativ",
      "status.directPlay": "Direkte Wiedergabe",

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

      "admin.kicker": "Admin Steuerung",
      "admin.title": "Server Dashboard",
      "admin.subtitle": "Live-Statistiken fuer Server, Benutzer und Content.",
      "admin.refreshNow": "Jetzt aktualisieren",
      "admin.refreshing": "Aktualisiere...",
      "admin.openSettings": "Zu den Einstellungen",
      "admin.uptime": "Uptime",
      "admin.activeSessions": "Aktive Sessions",
      "admin.totalUsers": "User gesamt",
      "admin.contentTotal": "Content Gesamt",
      "admin.enabledSources": "Aktive Quellen",
      "admin.trafficLoad": "Traffic Last",
      "admin.watchEvents24h": "Watch Events 24h",
      "admin.userDistribution": "Benutzerverteilung",
      "admin.sourceTypes": "Source-Typen",
      "admin.contentTypes": "Content-Typen",
      "admin.dailyPeakConcurrent": "Taegliche Peak Concurrent Streams",
      "admin.historyRange": "History Bereich",
      "admin.days7": "7 Tage",
      "admin.days14": "14 Tage",
      "admin.days30": "30 Tage",
      "admin.month": "Monat",
      "admin.selectMonth": "Monat waehlen",
      "admin.monthComparison": "Monatsvergleich",
      "admin.monthlyPeakTrend": "Monatlicher Peak Trend",
      "admin.newUsers7d": "Neue User (7 Tage)",
      "admin.noData": "Keine Daten",
      "admin.noHistoryData": "Keine History Daten",
      "admin.noMonthlyData": "Keine Monatsdaten",
      "admin.total": "Total",
      "admin.avgPerDay": "O / Tag",
      "admin.peak": "Peak",
      "admin.maxPeak": "Max Peak",
      "admin.avgPeak": "Avg Peak",
      "admin.totalEvents": "Total Events",
      "admin.highestPeak": "Hoechster Peak",
      "admin.lowestPeak": "Niedrigster Peak",
      "admin.trend": "Trend",
      "admin.current": "Aktuell",
      "admin.previous": "Vorher",
      "admin.daysTracked": "Tage erfasst",
      "admin.vs": "vs",
      "admin.cpu": "CPU",
      "admin.ram": "RAM",
      "admin.trafficUp": "TRAFFIC UP",
      "admin.trafficDown": "TRAFFIC DOWN",
      "admin.read": "READ",
      "admin.write": "WRITE",
      "admin.notAvailable": "Nicht verfuegbar",
      "admin.totalTraffic": "Gesamt Traffic",

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
    setText("#live-mobile-title", "nav.live");
    setText("#live-sidebar-title", "nav.live");
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
    setOptionByValue("live-category-select", "", "common.allGroups");
    setOptionByValue("epg-group-select", "", "common.allGroups");
    setOptionByValue("movies-source-select", "", "common.allSources");
    setOptionByValue("movies-category-select", "", "common.allCategories");
    setOptionByValue("series-source-select", "", "common.allSources");
    setOptionByValue("series-category-select", "", "common.allCategories");

    setText("#page-guide .guide-header h2", "guide.title");
    setPlaceholder("#epg-search", "common.searchChannels");
    setTitle("#page-guide .search-clear", "common.clearSearch");
    setText("#guide-prev-label", "guide.earlier");
    setText("#guide-next-label", "guide.later");
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
    setText("#epg-last-refresh-title", "settings.epgLastRefreshTitle");
    setText("#epg-last-refresh-hint", "settings.epgRefreshHint");
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
    setText("#hw-info-container .hint", "settings.loadingHardwareInfo");
    setText(
      "#tab-transcode .settings-section:nth-of-type(2) h3",
      "settings.encoderSettings",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(2) .setting-item:nth-of-type(1) .setting-label",
      "settings.hardwareEncoder",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(2) .setting-item:nth-of-type(1) .setting-hint",
      "settings.hardwareEncoderHint",
    );
    setOptionByValue("setting-hw-encoder", "auto", "settings.encoderAuto");
    setText(
      "#tab-transcode .settings-section:nth-of-type(2) .setting-item:nth-of-type(2) .setting-label",
      "settings.maxResolution",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(2) .setting-item:nth-of-type(2) .setting-hint",
      "settings.maxResolutionHint",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(2) .setting-item:nth-of-type(3) .setting-label",
      "settings.qualityPreset",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(2) .setting-item:nth-of-type(3) .setting-hint",
      "settings.qualityPresetHint",
    );
    setOptionByValue("setting-quality", "high", "settings.qualityHigh");
    setOptionByValue("setting-quality", "medium", "settings.qualityMedium");
    setOptionByValue("setting-quality", "low", "settings.qualityLow");
    setText(
      "#tab-transcode .settings-section:nth-of-type(2) .setting-item:nth-of-type(4) .setting-label",
      "settings.audioMixPreset",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(2) .setting-item:nth-of-type(4) .setting-hint",
      "settings.audioMixPresetHint",
    );
    setOptionByValue("setting-audio-mix", "auto", "settings.audioMixAuto");
    setOptionByValue("setting-audio-mix", "itu", "settings.audioMixITU");
    setOptionByValue("setting-audio-mix", "night", "settings.audioMixNight");
    setOptionByValue(
      "setting-audio-mix",
      "cinematic",
      "settings.audioMixCinematic",
    );
    setOptionByValue(
      "setting-audio-mix",
      "passthrough",
      "settings.audioMixPassthrough",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(3) h3",
      "settings.upscaling",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(3) .setting-item:nth-of-type(1) .setting-label",
      "settings.upscaleEnabled",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(3) .setting-item:nth-of-type(1) .setting-hint",
      "settings.upscaleEnabledHint",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(3) .setting-item:nth-of-type(2) .setting-label",
      "settings.upscaleMethod",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(3) .setting-item:nth-of-type(2) .setting-hint",
      "settings.upscaleMethodHint",
    );
    setOptionByValue(
      "setting-upscale-method",
      "hardware",
      "settings.upscaleHardware",
    );
    setOptionByValue(
      "setting-upscale-method",
      "software",
      "settings.upscaleSoftware",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(3) .setting-item:nth-of-type(3) .setting-label",
      "settings.upscaleTarget",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(3) .setting-item:nth-of-type(3) .setting-hint",
      "settings.upscaleTargetHint",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(4) h3",
      "settings.streamProcessing",
    );
    setText("#setting-native-player-label", "settings.nativeVlcPlayer");
    setText(
      "#setting-native-player-row .setting-hint",
      "settings.nativeVlcHint",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(4) .setting-item:nth-of-type(2) .setting-label",
      "settings.autoTranscode",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(4) .setting-item:nth-of-type(2) .setting-hint",
      "settings.autoTranscodeHint",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(4) .setting-item:nth-of-type(3) .setting-label",
      "settings.forceAudioTranscode",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(4) .setting-item:nth-of-type(3) .setting-hint",
      "settings.forceAudioTranscodeHint",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(4) .setting-item:nth-of-type(4) .setting-label",
      "settings.forceVideoTranscode",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(4) .setting-item:nth-of-type(4) .setting-hint",
      "settings.forceVideoTranscodeHint",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(4) .setting-item:nth-of-type(5) .setting-label",
      "settings.forceRemux",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(4) .setting-item:nth-of-type(5) .setting-hint",
      "settings.forceRemuxHint",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(4) .setting-item:nth-of-type(6) .setting-label",
      "settings.streamOutputFormat",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(4) .setting-item:nth-of-type(6) .setting-hint",
      "settings.streamOutputFormatHint",
    );
    setOptionByValue(
      "setting-stream-format-tc",
      "m3u8",
      "settings.streamFormatHls",
    );
    setOptionByValue(
      "setting-stream-format-tc",
      "ts",
      "settings.streamFormatTs",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(5) h3",
      "settings.httpSettings",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(5) .setting-item:nth-of-type(1) .setting-label",
      "settings.userAgent",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(5) .setting-item:nth-of-type(1) .setting-hint",
      "settings.userAgentHint",
    );
    setOptionByValue(
      "setting-user-agent-tc",
      "chrome",
      "settings.userAgentChrome",
    );
    setOptionByValue("setting-user-agent-tc", "vlc", "settings.userAgentVlc");
    setOptionByValue(
      "setting-user-agent-tc",
      "tivimate",
      "settings.userAgentTiviMate",
    );
    setOptionByValue(
      "setting-user-agent-tc",
      "custom",
      "settings.userAgentCustom",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(5) .setting-item:nth-of-type(2) .setting-label",
      "settings.customUserAgent",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(5) .setting-item:nth-of-type(2) .setting-hint",
      "settings.customUserAgentHint",
    );
    setPlaceholder(
      "#setting-user-agent-custom-tc",
      "settings.customUserAgentPlaceholder",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(6) h3",
      "settings.network",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(6) .setting-item .setting-label",
      "settings.forceBackendProxy",
    );
    setText(
      "#tab-transcode .settings-section:nth-of-type(6) .setting-item .setting-hint",
      "settings.forceBackendProxyHint",
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
