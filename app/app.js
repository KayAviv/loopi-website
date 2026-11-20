'use strict';
/* LOOPI app shell — plain JS SPA, no build step, no frameworks.
 *
 * Server contract: ~/workspace/nocta/src/app.js (README has the table).
 * CONFIG.apiBase picks the API origin; '' = same origin as this page.
 * For local dev against the standalone server, set it to
 * 'http://localhost:8472' (or open this file through a static server
 * and edit the constant).
 *
 * Honesty rules baked in:
 *  - Demo content is always labelled "demo" and lives only on-device.
 *  - Server features that need configuration (generation, billing,
 *    live) surface their configured/unconfigured state in the UI;
 *    nothing fakes a success the server didn't give.
 *  - Generation errors 503 / 402 are shown as the states they are.
 */
var CONFIG = { apiBase: 'https://loopi-api-0szz.onrender.com' };

/* Icon set (icons.js, loaded before this file): glossy 3D PNGs for
 * gifts/games/coins + stroke SVGs for chrome. The fallback keeps the
 * shell alive (text-only) if the icon script ever fails to load. */
var LOOPI_ICONS = window.LOOPI_ICONS || {
  svg: function () { return ''; },
  giftImg: function () { return ''; },
  gameImg: function () { return ''; },
  coinImg: function () { return ''; },
  badge: function () { return ''; }
};

/* EDITION DEFAULT LANGUAGE — packaging flips this ONE line per build:
 *   'en' → the global edition (English-first)
 *   'zh' → the China edition (Chinese-first)
 * It only sets the FIRST-RUN language. The moment a user picks a
 * language in Profile \u2192 Settings, their saved choice wins forever.
 * There is deliberately no other language control anywhere in the UI. */
var DEFAULT_LANG = 'en';

/* ---- mirrored from src/config.js (client fallback; API wins) ---- */
var INTERESTS = ['food', 'music', 'comedy', 'sports', 'travel', 'animals', 'gaming',
  'beauty', 'tech', 'dance', 'fitness', 'film', 'fashion', 'diy', 'nature', 'cars'];
var CREATOR_LEVELS = [
  { level: 1, name: 'Starter', minXp: 0, reachBoost: 0.0 },
  { level: 2, name: 'Rising', minXp: 50, reachBoost: 0.25 },
  { level: 3, name: 'Creator', minXp: 150, reachBoost: 0.6 },
  { level: 4, name: 'Pro Creator', minXp: 400, reachBoost: 1.0 },
  { level: 5, name: 'Star Creator', minXp: 1000, reachBoost: 2.0 }
];
var CREDIT_PACKS = [
  { id: 'pack_1000', credits: 1000, priceUsd: 20 },
  { id: 'pack_2500', credits: 2500, priceUsd: 50 },
  { id: 'pack_6000', credits: 6000, priceUsd: 120 }
];
/* Mirrors of src/config.js creator rules — used ONLY as the offline /
 * demo fallback. When signed in, GET /v1/creator-levels replaces all
 * of this (see demoLevelsInfo / loadCreatorLevels). */
var CREATOR_BADGES = [
  { id: 'first_upload', name: 'First Upload', icon: '🎬', description: 'Upload your first video' },
  { id: 'streak_7', name: '7-Day Streak', icon: '🔥', description: 'Upload on 7 days in a row' },
  { id: 'likes_100', name: '100 Likes', icon: '❤️', description: 'Earn 100 likes across your videos' },
  { id: 'level_2', name: 'Rising', icon: '⬆', description: 'Reach Level 2 · Rising' },
  { id: 'level_3', name: 'Creator', icon: '⬆', description: 'Reach Level 3 · Creator' },
  { id: 'level_4', name: 'Pro Creator', icon: '⬆', description: 'Reach Level 4 · Pro Creator' },
  { id: 'level_5', name: 'Star Creator', icon: '⭐', description: 'Reach Level 5 · Star Creator' }
];
function demoLevelsInfo() {
  return {
    levels: CREATOR_LEVELS,
    xpActions: { upload: 10, aiGeneration: 5, firstUpload: 25 },
    earning: [
      { action: 'upload', xp: 10, label: 'Upload a video' },
      { action: 'aiGeneration', xp: 5, label: 'Generate a video with AI' },
      { action: 'firstUpload', xp: 25, label: 'One-time bonus for your very first upload' }
    ],
    streak: { xpPerDay: 2, capDays: 7, maxBonusXp: 14 },
    milestones: [
      { id: 'likes_100', metric: 'likes', threshold: 100, xp: 50 },
      { id: 'likes_1000', metric: 'likes', threshold: 1000, xp: 200 },
      { id: 'comments_50', metric: 'comments', threshold: 50, xp: 40 }
    ],
    badges: CREATOR_BADGES
  };
}
var AD_EVERY = 6; // an ad-slot card after every N feed items

/* ---------------- i18n ----------------
 * First-run language comes from DEFAULT_LANG (see CONFIG above): the
 * global edition ships 'en', the China edition ships 'zh'. The user's
 * own choice lives in Settings (Profile → Settings → Language),
 * is persisted on-device, and applies app-wide — from then on it
 * always wins over the edition default. There is deliberately NO
 * language toggle on the feed or tab bar. */
var STRINGS = {
  en: {
    tagline: 'Watch. Upload. Generate.', login: 'Log in', signup: 'Sign up',
    displayName: 'Display name', handle: 'Handle', email: 'Email', password: 'Password',
    or: 'or', browseDemo: 'Browse the demo first',
    authNote: 'Demo mode uses sample content on this device. An account uses the real LOOPI server.',
    pickInterests: 'What are you into?',
    pickInterestsSub: 'Pick a few — your For You feed tunes itself to these.',
    continue: 'Continue', skip: 'Skip for now',
    demoBanner: 'Demo content — connect to the server for the live feed',
    send: 'Send', discover: 'Discover',
    searchNote: "Explore squares are creators you don't follow. Tap one to jump into their video.",
    searchPlaceholder: 'Search videos, people, rooms, hashtags…',
    live: 'Live', goLive: 'Go Live', liveNow: 'Live now', inbox: 'Inbox',
    newRoom: '+ New room', roomName: 'Room name', roomType: 'Type',
    roomGroup: 'Group chat', roomOpen: 'Open room', roomPrivate: 'Private (password)',
    roomPassword: 'Password', createRoom: 'Create room', profile: 'Profile',
    credits: 'Credits', balance: 'Balance',
    videosWord: 'Videos', shopCredits: 'Shop / Credits', earnings: 'Earnings',
    earningsNote: 'Tips you received, tracked separately for payout.',
    creditsForLine: 'Credits power AI video generation and tips to streamers.',
    buyCredits: 'Buy credits', topUp: 'Top up', currentBalance: 'Current balance',
    creditsNeeded: 'This video needs {n} credit(s).',
    editProfile: 'Edit profile', messageVerb: 'Message', bioWord: 'Bio',
    profileUpdated: 'Profile updated.', peopleEmpty: 'No one to show yet.',
    noVideosYet: 'No videos yet.', saveChanges: 'Save changes', searchWord: 'Search',
    bioTitle: 'Biometric unlock', bioUnlock: 'Unlock with fingerprint',
    bioNote: 'Your session stays sealed on this device. If biometric unlock fails, use your password.',
    bioEnabled: 'Biometric unlock is on for this phone.',
    bioDisabled: 'Biometric unlock is off.',
    bioFailed: 'Biometric unlock did not complete.',
    howLevels: 'How levels work',
    howLevelsSub: 'Uploading earns XP. Higher level = a bigger starting reach boost in everyone\'s feed. Levels never buy views directly — watch time still decides.',
    logout: 'Log out', settings: 'Settings', settingsTitle: 'Settings',
    language: 'Language', languageNote: 'Applies to the whole app right away.',
    about: 'About',
    aboutText: 'Upload-first short video. AI generation is one option inside — never the whole app.',
    dangerZone: 'Danger zone',
    deleteAccount: 'Delete account',
    deleteAccountNote: 'Permanently delete your account and everything in it. This cannot be undone.',
    deleteAccountWarn: 'This permanently deletes your account, your videos, credits, earnings, messages and creator progress. There is no undo and no recovery.',
    deletePasswordLabel: 'Enter your password to confirm',
    deletePasswordPlaceholder: 'Your password',
    deleteConfirm: 'Delete permanently',
    deletePasswordRequired: 'Enter your password to delete your account.',
    accountDeleted: 'Your account has been deleted.',
    deleteNeedsAccount: 'Demo accounts have nothing to delete — sign in with a real account first.',
    shareWhich: 'Share which video?', comments: 'Comments',
    create: 'Create', recordUpload: 'Record / Upload',
    uploadNote: 'Your own video, up to 20 seconds.',
    generateAi: 'Generate with AI',
    generateNote: 'Describe it — AI makes it. The price is always on the button.',
    promptPlaceholder: 'A panda skateboarding through neon Tokyo at night…',
    oneCredit: '1 credit', twoCredits: '2 credits', generate: 'Generate',
    tipNote: 'Tips go to the streamer',
    tabHome: 'Home', tabDiscover: 'Discover', tabLive: 'Live', tabInbox: 'Inbox',
    tabGames: 'Games', games: 'Games',
    tabFeed: 'Feed', tabArena: 'Arena', tabChat: 'Chat', following: 'Following', forYou: 'For You',
    filmed: 'FILMED', originalSound: 'original sound', ariaSearch: 'Search',
    gamesNote: 'Small games, big bragging rights. Challenge a friend and the card lands right inside your chat.',
    gameCoins: 'Game coins',
    coinsNote: 'Game coins are earned by playing — never bought. They are a separate games currency and never convert into credits or cash.',
    challengeFriend: 'Challenge a friend', play: 'Play', locked: 'Locked',
    inBuild: 'In build', unlocksAt: 'Unlocks at Level', xpToGo: 'XP to go',
    leaderboard: 'Leaderboard', wins: 'wins',
    challengeWhich: 'Challenge in which chat?', cancel: 'Cancel',
    challengeTitle: 'Game challenge', challengeSent: 'Challenge sent',
    challengeDefault: 'I challenge you to a match!',
    acceptChallenge: 'Accept',
    gsGroupGame: 'Group game', gsSessionBy: 'started a group game',
    gsJoin: 'Join game', gsHost: 'host', gsYou: 'You',
    gsStatusLobby: 'In the lobby', gsStatusPlaying: 'Playing now', gsStatusFinished: 'Finished',
    gsResults: 'Final standings', gsNoPrizes: 'Just for fun — no prizes',
    gsWaiting: 'Waiting for players…', gsNeedTwo: 'Waiting for one more player…',
    gsStartMatch: 'Start match', gsSpectator: 'You are spectating',
    gsLive: 'Live standings', gsBackToChat: 'Back to chat', gsLeave: 'Leave',
    gsDemoSim: 'Demo session — the other players are simulated on this device',
    gsGameOver: 'Game over', gsStartFailed: 'Could not start the game session',
    compTitle: 'Weekly competition',
    compThisWeek: "This week's prompt",
    compPromptWord: 'Prompt',
    compPrize: 'Prize: ✦ {n} credits',
    compEntries: '{n} entries', compEntriesOne: '1 entry',
    compEndsIn: 'Ends in {t}',
    compYourEntry: 'Your entry is in — good luck!',
    compEnter: 'Enter this video',
    compPickYours: 'Enter one of your AI videos:',
    compNoAiVideos: 'No AI videos of yours yet — generate this week\'s prompt to enter.',
    compGenerateCta: 'Generate the prompt',
    compDormant: 'Opens at {min} creators — currently {n}',
    compProgress: '{n} / {min} creators',
    compWinner: 'Winner',
    compWonWith: 'won with {n} likes',
    compPastWinners: 'Past winners',
    compNoWinnersYet: 'No winners yet — the first crown is still open.',
    compEnteredToast: 'You are in! Your entry is locked for this week.',
    compDemoNote: 'Demo preview — entering needs a real account, and competitions open at 500 creators.',
    compLikesWord: 'likes',
    err_COMPETITIONS_NOT_ACTIVE: 'Competitions are not open yet.',
    err_COMPETITION_CLOSED: 'This week\'s competition has ended.',
    err_NOT_AI_VIDEO: 'Entries must be videos you generated with AI.',
    err_NOT_YOUR_VIDEO: 'You can only enter your own videos.',
    err_ALREADY_ENTERED: 'You already entered this week.',
    startGame: 'Start', playAgain: 'Play again',
    yourLevel: 'Your level', nextUnlock: 'Next unlock',
    gamePenalty: 'Penalty Kicks',
    gamePenaltyBlurb: 'Best-of-5 shootout against the keeper bot.',
    gameFood: 'FoodNinja',
    gameFoodBlurb: 'Swipe-slice flying food against the clock — solo vs AI or 1v1 online.',
    foodRules: 'Swipe through flying food to slice it. 3+ in one swipe = Combo Platter bonus. Fill the meter for FEVER double points. Never slice the rotten egg!',
    pkPower: 'Power',
    gamePong: 'Ping Pong',
    gamePongBlurb: '1v1 paddle duel against the bot. First to 7.',
    gameVolley: 'Volley Duel',
    gameVolleyBlurb: '1v1 timed sports duel — most points when the clock runs out wins.',
    gameVolfield: 'Volfield',
    gameVolfieldBlurb: 'Territory capture vs a roaming boss — draw lines, claim 80%, dodge the charge.',
    gamePoker: 'Poker',
    gamePokerBlurb: 'Friendly hold\'em tables with friends and bots.',
    pokerFreeShort: 'Free coins only — earned by playing, never bought, never cashed out.',
    penaltyRules: 'Best of 5, then sudden death. Shooting: swipe across the goal — where your flick lands is where the ball goes, and full-power flicks near the frame can fly wide. Saving: swipe to dive the moment the bot shoots — late dives cover less ground.',
    pongRules: 'First to 7. Drag or move the mouse to slide your paddle (bottom). The bot gets quicker every time you score.',
    volleyTitle: 'Volley Duel — 1v1, on the clock',
    volleyRules: 'A 60-second timed duel. Serve, bump and spike over the net — most points when the clock hits zero wins. Beat the bot to warm up, then challenge a friend for the real crown.',
    volleySoon: 'This one is still being built — the court, net physics and timed rounds land in a later update. Challenges posted now are demo cards.',
    pokerTitle: 'Poker — friendly tables',
    pokerRules: 'Texas hold\'em at friendly tables — you, your friends and a few bots. Two cards down, five on the board, best hand takes the pot of game coins.',
    pokerFreeRule: 'Free coins only. Poker here runs on game coins that are earned by playing — they are never sold, never bought, and can never be converted into credits or cashed out. It is a game, not gambling.',
    pokerSoon: 'Tables are still being built. Challenges posted now are demo cards.',
    messagePlaceholder: 'Message…', commentPlaceholder: 'Add a comment…',
    liveChatPlaceholder: 'Say something…',
    modeDemo: 'Mode: demo (on-device sample content)',
    modeLive: 'Mode: connected account',
    xpToNext: 'XP to next level', maxLevel: 'Top level reached',
    reachBoost: 'reach boost', level: 'Level',
    streakDays: 'day upload streak', nextBadge: 'Next badge',
    earnTitle: 'Ways to earn XP', badgesTitle: 'Badges',
    streakRuleLabel: 'Upload streak bonus', milestoneLabel: 'Video milestone',
    levelUpToast: 'Level up!', badgeToast: 'New badge:',
    watchingDemo: 'Sample stream layout — live video connects when LiveKit is wired on the server.',
    liveReady: 'Ready to connect', liveConnecting: 'Connecting…', liveConnected: 'Connected', liveOnAir: 'On air', liveReconnecting: 'Reconnecting…', liveWaitingMsg: 'Waiting for the host to start the video…', liveEndedMsg: 'This stream has ended.', liveLostMsg: 'Connection lost — the stream may have ended.', liveDeniedMsg: 'Camera or microphone was denied, so nothing is broadcasting. Allow access and rejoin to appear on camera.', liveUnavailableMsg: 'Live video could not start here — check your connection and try again.', 
    interest_food: 'Food', interest_music: 'Music', interest_comedy: 'Comedy',
    interest_sports: 'Sports', interest_travel: 'Travel', interest_animals: 'Animals',
    interest_gaming: 'Gaming', interest_beauty: 'Beauty', interest_tech: 'Tech',
    interest_dance: 'Dance', interest_fitness: 'Fitness', interest_film: 'Film',
    interest_fashion: 'Fashion', interest_diy: 'DIY', interest_nature: 'Nature',
    interest_cars: 'Cars',
    share: 'Share', remix: 'Remix',
    adSlot: 'Ad slot',
    adText: 'An ad appears here every so often \u2014 that\'s the deal that keeps LOOPI free to watch.',
    demoTag: 'demo', unknownUser: 'unknown',
    noComments: 'No comments yet \u2014 start the conversation.',
    shareDefaultText: 'Watch this on LOOPI',
    linkCopied: 'Link copied \u2014 paste it into WhatsApp, Instagram, SMS\u2026',
    nothingMatches: 'Nothing matches \u2014 try another word.',
    uploadTooLong: 'That video is {s}s \u2014 LOOPI caps uploads at 20 seconds. Trim it and try again.',
    uploadLooksGood: 'Looks good ({s}s).',
    uploadCheckingToast: 'Uploaded — safety check running. It appears in the feed once it passes.',
    modChecking: 'Checking…',
    modRejected: 'Rejected',
    uploadNotVideo: 'Could not read that file as a video.',
    uploadCaptionPh: 'Add a caption\u2026',
    uploadPostBtn: 'Post to LOOPI',
    uploadReadyPost: 'Ready \u2014 tap Post to publish it for everyone.',
    uploadLocalOnly: 'Preview is only on this device. Sign in to post it for everyone.',
    uploadingPct: 'Uploading\u2026 {p}%',
    uploadPosted: 'Posted \u2014 your video is live on LOOPI.',
    addSong: 'Add a song',
    addSongNone: 'No song',
    addSongNote: 'Free to use \u2014 the song replaces your video\u2019s own sound.',
    musicUnavailable: 'Songs are unavailable right now.',
    previewSong: 'Play preview',
    stopSong: 'Stop preview',
    titleVoiceMessage: 'Voice message',
    voiceRecording: 'Recording…',
    voiceSending: 'Sending voice message…',
    transcribing: 'Transcribing…',
    newPostsPill: '{count} new posts',
    voiceMicDenied: 'Microphone access was denied — allow it to send a voice message.',
    voiceUnsupported: 'Voice recording is not supported on this device.',
    voiceNeedsAccount: 'Voice messages need a signed-in account.',
    voiceSendFailed: 'Could not send the voice message. Try again.',
    mood_upbeat: 'Upbeat pop',
    mood_chill: 'Chill',
    mood_rock: 'Rock',
    mood_edm: 'EDM',
    mood_acoustic: 'Happy acoustic',
    mood_dramatic: 'Dramatic',
    uploadMixingToast: 'Posted \u2014 adding your song now. It appears in the feed in a few seconds.',
    uploadFailed: 'Upload failed. Check your connection and try again.',
    uploadTooBig: 'That file is too large \u2014 LOOPI accepts up to 100 MB.',
    genDescribeFirst: 'Describe the video first (at least a few characters).',
    genNeedsAccount: 'Generation spends real credits, so it needs a real account \u2014 you are browsing the demo. Sign up to generate.',
    genNotEnough: 'Not enough credits \u2014 this generation needs {n}. Grab a pack in your profile.',
    genNotEnoughFull: 'Not enough credits for that generation. Grab a pack in your profile.',
    genDone: 'Done \u2014 your generation is in the feed.',
    genResultCaption: '\u2014 charged {n} credit(s). It is live in the feed now.',
    serverUnreachable: 'Server unreachable',
    serverUnreachableAuth: 'Server unreachable \u2014 check the API is running, or browse the demo.',
    genServerUnreachable: 'Server unreachable \u2014 generation needs the API running.',
    emailPasswordRequired: 'Email and password are required.',
    onboardSaveFailed: 'Could not save \u2014 you can change interests later in your profile.',
    directMessage: 'Direct message',
    roomKind_dm: 'dm', roomKind_group: 'group', roomKind_open: 'open', roomKind_private: 'private',
    roomPasswordTag: 'password',
    noChatsYet: 'No chats yet \u2014 create a room below, or share a video to a friend.',
    roomPrivatePrompt: 'This room is private \u2014 enter its password:',
    sharedVideo: 'Shared a video', videoWord: 'Video',
    roomNameRequired: 'Give the room a name.',
    roomPasswordShort: 'Private rooms need a password of at least 4 characters.',
    roomDemoCreated: 'Demo room created (on this device).',
    roomCreated: 'Room created.',
    nobodyLive: 'Nobody is live right now \u2014 be the first.',
    liveWord: 'live', liveBadge: '\u25CF LIVE',
    isLiveSuffix: ' is live', theStreamer: 'the streamer',
    tipDemo: 'Demo stream \u2014 tips need a real stream and a signed-in account. Nothing was charged.',
    tippedMsg: 'You tipped \u2726 {amount} to {who} \u2014 thank you for supporting them.',
    giftBtn: 'Gift', giftShelfTitle: 'Send a gift',
    giftBalance: 'Your balance',
    giftSentMsg: 'You sent a {gift} to {who} \u2014 thank you for supporting them.',
    giftEventLine: 'sent a {gift}',
    giftDemo: 'Demo stream \u2014 gifts need a real stream and a signed-in account. Nothing was charged.',
    giftName_rose: 'Rose', giftName_heart: 'Heart', giftName_star: 'Star', giftName_crown: 'Crown',
    giftName_rocket: 'Rocket', giftName_diamond: 'Diamond', giftName_castle: 'Castle', giftName_dragon: 'Dragon',
    goLiveNeedsAccount: 'Going live needs a real account \u2014 you are browsing the demo.',
    youAreLive: 'You are live \u2014 ready to connect.',
    liveNotConfiguredMsg: 'Your live room was created, but live streaming is not switched on at the server yet, so there is no broadcast to join. The room exists; the video starts once the server is configured.',
    perCreditPrice: '$2.00 / credit', buy: 'Buy',
    checkoutDemo: 'Demo mode: checkout is not real here. In the live app this pack is bought through Play Billing.',
    packStubMsg: 'Added \u2726 {n} \u2014 honestly: the server granted these through its billing STUB. Play Billing verification is not wired yet, so no real payment was taken or checked.',
    packAddedMsg: 'Added \u2726 {n} credits.',
    tagUploader: 'Uploader', tagExplorer: 'Explorer',
    earlyMember: 'Early member', interestsWord: 'interests',
    youDemoName: 'You (demo)',
    lvlName_starter: 'Starter', lvlName_rising: 'Rising', lvlName_creator: 'Creator',
    lvlName_procreator: 'Pro Creator', lvlName_starcreator: 'Star Creator',
    earnUpload: 'Upload a video', earnGenerate: 'Generate a video with AI',
    earnFirstUpload: 'One-time bonus for your very first upload',
    badge_first_upload: 'First Upload', badge_streak_7: '7-Day Streak', badge_likes_100: '100 Likes',
    badge_level_2: 'Rising', badge_level_3: 'Creator', badge_level_4: 'Pro Creator', badge_level_5: 'Star Creator',
    metric_likes: 'likes', metric_comments: 'comments',
    youWord: 'You', botWord: 'Bot', beatThat: 'Beat that!',
    coinsRewardSuffix: ' game coins.',
    pkResultWinText: 'You win {a} — {b}! +{r} game coins.',
    pkResultLoseText: 'Bot wins {a} — {b}. +{r} game coins.',
    pongResultWinText: 'You win {a} — {b} · +{r} game coins.',
    pongResultLoseText: 'Bot wins {a} — {b} · +{r} game coins.',
    pkYouFirst: 'Your shot first \u2014 swipe across the goal into a corner.',
    pkFullTime: 'Full time', pkSuddenDeath: 'Sudden death',
    pkYourShotKick: 'Your shot \u00B7 kick {n} of 5 \u2014 swipe to shoot',
    pkBotShootsKick: 'Bot shoots \u00B7 kick {n} of 5 \u2014 swipe to dive!',
    pkYourShotSD: 'Sudden death \u00B7 your shot \u2014 swipe!',
    pkBotShootsSD: 'Sudden death \u00B7 bot shoots \u2014 swipe to dive!',
    pkBotShootsMsg: 'Bot shoots \u2014 swipe to dive as he strikes!',
    pkYourShotMsg: 'Your shot \u2014 swipe into a corner.',
    pkGoalMsg: '\u26BD GOAL! {zone} at {pct}% power',
    pkGoalSuffixRocket: ' \u2014 the keeper had no chance.',
    pkGoalSuffixPlaced: ' \u2014 placed it beautifully.',
    pkSavedMsg: 'Saved! The keeper got there — you went {zone} at {pct}% power.',
    pkMissOver: 'Over the bar! Too much power on it.',
    pkMissLeft: 'Wide left! It bent past the post.',
    pkMissRight: 'Wide right! It bent past the post.',
    pkMissTurf: 'Into the turf — that one never got going.',
    pkMissPowerSuffix: ' ({pct}% power)',
    pkYouFroze: 'You froze \u2014 ',
    pkYouSavedIt: 'YOU SAVED IT! Read the {zone} shot all the way.',
    pkBotScores: '\u26BD Bot scores. He put it {zone}.',
    zone_tl: 'top left', zone_tm: 'top middle', zone_tr: 'top right',
    zone_bl: 'bottom left', zone_bm: 'bottom middle', zone_br: 'bottom right',
    poBotMatch: 'Bot match', poOnlineMatch: 'Play a friend · 1v1 online',
    poCreateRoom: 'Create room', poQuickMatch: '\u26A1 Quick match',
    poJoinRoom: 'Join room', poLeaveMatch: 'Leave match',
    poRoomWord: 'Room', poSendCode: ' \u2014 send this code to your friend',
    codePlaceholder: 'CODE',
    fnVsAi: 'vs AI', fnOnline: '1v1 online',
    diffEasy: 'Easy', diffNormal: 'Normal', diffHard: 'Hard',
    feverTag: 'FEVER ×2',
    appTitle: 'LOOPI \u2014 watch, upload, generate',
    placeholderHandle: 'yourname',
    ariaProfile: 'Profile', ariaBack: 'Back', ariaClose: 'Close', ariaCreate: 'Create',
    titleShareVideo: 'Share a video', titleGroupGame: 'Start a group game',
    gsCode: 'Code',
    err_OFFLINE: 'Server unreachable.',
    err_INSUFFICIENT_CREDITS: 'Not enough credits.',
    err_GENERATION_NOT_CONFIGURED: 'AI generation is not switched on at the server yet. Nothing was charged.',
    err_BILLING_NOT_CONFIGURED: 'Credit purchases are not switched on at the server yet \u2014 billing is not configured.',
    err_BILLING_MISCONFIGURED: 'Billing is misconfigured on the server. Please try again later.',
    err_LIVE_NOT_CONFIGURED: 'Live streaming is not switched on at the server yet.',
    err_CANNOT_TIP_SELF: 'You cannot tip yourself.',
    err_INVALID_TIP_AMOUNT: 'That tip amount is not valid.',
    err_CANNOT_GIFT_SELF: 'You cannot gift yourself.',
    err_INVALID_GIFT: 'Unknown gift.',
    err_STREAM_ENDED: 'This stream has ended.',
    err_UNKNOWN_PRODUCT: 'Unknown credit pack.',
    err_PURCHASE_ALREADY_PROCESSED: 'That purchase was already processed.',
    err_PURCHASE_NOT_COMPLETED: 'That purchase was not completed.',
    err_PURCHASE_NOT_FOUND: 'That purchase could not be found.',
    err_PURCHASE_TOKEN_REQUIRED: 'A purchase token is required.',
    err_PURCHASE_VERIFICATION_FAILED: 'That purchase could not be verified.',
    err_BILLING_UPSTREAM_ERROR: 'The billing service is unreachable right now. Please try again later.',
    err_GENERATION_FAILED: 'Generation failed \u2014 your credit was refunded.',
    err_PASSWORD_CONFIRMATION_FAILED: "That password doesn't match — account not deleted.",
    err_GAME_HUB_UNAVAILABLE: 'Games are unavailable right now.',
    pongWin: 'YOU WIN', pongLose: 'BOT WINS', ariaNewMessage: 'New message',
    notifications: 'Notifications', notifTitle: 'Notifications',
    notifEmpty: 'Nothing here yet — follows, requests, messages and likes land here.',
    notifMarkAllRead: 'Mark all read',
    follow: 'Follow', followingBtn: 'Following', requestedBtn: 'Requested',
    approve: 'Approve', decline: 'Decline',
    ntf_follow_request: '{name} wants to follow you',
    ntf_follow_accepted: '{name} accepted your follow request',
    ntf_new_follower: '{name} started following you',
    ntf_message: '{name} sent you a message',
    ntf_like: '{name} liked your video',
    ntf_comment: '{name} commented on your video',
    ntf_live_started: '{name} went live',
    ntf_game_invite: '{name} opened a group game',
    ntf_competition_result: 'You won the weekly competition! ✦ {n} credits are in your balance.',
    privacyTitle: 'Account privacy',
    privacyPublic: 'Public', privacyPrivate: 'Private',
    privacyPublicNote: 'Anyone can see your profile and videos, and can follow you instantly.',
    privacyPrivateNote: 'Only followers you approve can see your videos and full profile. Follows become requests you approve or decline.',
    privateAccount: 'This account is private',
    followToSee: 'Follow this account to see their videos.',
    notifPrefsTitle: 'Notifications',
    notifPrefsNote: 'Choose what lands in your inbox. Turned-off types are never created.',
    npref_follow_request: 'Follow requests', npref_follow_accepted: 'Request accepted',
    npref_new_follower: 'New followers', npref_message: 'Messages', npref_like: 'Likes',
    npref_comment: 'Comments', npref_live_started: 'Live starts', npref_game_invite: 'Game invites',
    npref_competition_result: 'Competition results',
    followersWord: 'followers', followingWord: 'following',
    creatorVideos: 'Videos',
    requestSentToast: 'Request sent — {name} has to approve it.',
    followingToast: 'You are now following {name}.',
    unfollowedToast: 'Unfollowed {name}.',
    requestApprovedToast: '{name} is now following you.',
    requestDeclinedToast: 'Request declined.',
    privacySavedToast: 'Privacy updated.',
    err_ACCOUNT_PRIVATE: 'This account is private.',
  },
  zh: {
    tagline: '观看。上传。生成。', login: '登录', signup: '注册',
    displayName: '昵称', handle: '用户名', email: '邮箱', password: '密码',
    or: '或', browseDemo: '先看看演示',
    authNote: '演示模式使用本机上的示例内容。注册账号后将使用真正的 LOOPI 服务器。',
    pickInterests: '你对什么感兴趣？',
    pickInterestsSub: '选几个 — 推荐 feed 会据此为你调优。',
    continue: '继续', skip: '暂时跳过',
    demoBanner: '演示内容 — 连接服务器后显示实时 feed',
    send: '发送', discover: '发现',
    searchNote: '探索格子里是你还没有关注的创作者。点一个即可跳进他的视频。',
    searchPlaceholder: '搜索视频、用户、房间、话题…',
    live: '直播', goLive: '开始直播', liveNow: '正在直播', inbox: '消息',
    newRoom: '+ 新建房间', roomName: '房间名称', roomType: '类型',
    roomGroup: '群聊', roomOpen: '开放房间', roomPrivate: '私密（密码）',
    roomPassword: '密码', createRoom: '创建房间', profile: '我的',
    credits: '积分', balance: '余额',
    videosWord: '视频', shopCredits: '商店 / 积分', earnings: '收益',
    earningsNote: '你收到的打赏会单独记录，用于结算。',
    creditsForLine: '积分可用于 AI 视频生成和打赏主播。',
    buyCredits: '购买积分', topUp: '充值', currentBalance: '当前余额',
    creditsNeeded: '这个视频需要 {n} 积分。',
    editProfile: '编辑资料', messageVerb: '发消息', bioWord: '简介',
    profileUpdated: '资料已更新。', peopleEmpty: '暂时没有人。',
    noVideosYet: '还没有视频。', saveChanges: '保存更改', searchWord: '搜索',
    bioTitle: '生物识别解锁', bioUnlock: '用指纹解锁',
    bioNote: '你的会话会通过 Android Keystore 密封保存在这部手机上。如果生物识别解锁失败，请使用密码。',
    bioEnabled: '这部手机已开启生物识别解锁。',
    bioDisabled: '生物识别解锁已关闭。',
    bioFailed: '生物识别解锁未完成。',
    howLevels: '等级如何运作',
    howLevelsSub: '上传视频可获得 XP。等级越高，在大家 feed 中的初始推荐加成越大。等级不能直接买来播放量 — 观看时长仍然决定一切。',
    logout: '退出登录', settings: '设置', settingsTitle: '设置',
    language: '语言', languageNote: '立即应用到整个应用。',
    about: '关于',
    aboutText: '以上传为先的短视频应用。AI 生成只是其中的一个选项 — 从不是全部。',
    dangerZone: '危险区',
    deleteAccount: '删除账号',
    deleteAccountNote: '永久删除你的账号及其全部内容。此操作无法撤销。',
    deleteAccountWarn: '这将永久删除你的账号、视频、积分、收益、消息和创作者进度。无法撤销，也无法恢复。',
    deletePasswordLabel: '输入你的密码以确认',
    deletePasswordPlaceholder: '你的密码',
    deleteConfirm: '永久删除',
    deletePasswordRequired: '请输入密码以删除账号。',
    accountDeleted: '你的账号已删除。',
    deleteNeedsAccount: '演示账号没有可删除的内容 — 请先登录真实账号。',
    shareWhich: '分享哪个视频？', comments: '评论',
    create: '创作', recordUpload: '录制 / 上传',
    uploadNote: '你自己的视频，最长 20 秒。',
    generateAi: '用 AI 生成',
    generateNote: '描述它 — AI 来制作。价格永远写在按钮上。',
    promptPlaceholder: '一只熊猫在霓虹闪烁的东京夜里滑滑板…',
    oneCredit: '1 积分', twoCredits: '2 积分', generate: '生成',
    tipNote: '打赏 — 送给主播',
    tabHome: '首页', tabDiscover: '发现', tabLive: '直播', tabInbox: '消息',
    tabGames: '游戏', games: '游戏',
    tabFeed: '广场', tabArena: '竞技场', tabChat: '聊天', following: '关注', forYou: '推荐',
    filmed: '实拍', originalSound: '原创音乐', ariaSearch: '搜索',
    gamesNote: '小游戏，大荣誉。挑战朋友，挑战卡会直接发到你们的聊天里。',
    gameCoins: '游戏币',
    coinsNote: '游戏币靠玩游戏赚取 — 从不出售购买。它是独立的游戏货币，永远不能兑换成积分或现金。',
    challengeFriend: '挑战朋友', play: '开始玩', locked: '未解锁',
    inBuild: '开发中', unlocksAt: '解锁等级', xpToGo: '还差 XP',
    leaderboard: '排行榜', wins: '胜场',
    challengeWhich: '在哪个聊天里发起挑战？', cancel: '取消',
    challengeTitle: '游戏挑战', challengeSent: '挑战已发送',
    challengeDefault: '我向你发起挑战！',
    acceptChallenge: '接受挑战',
    gsGroupGame: '群游戏', gsSessionBy: '发起了一场群游戏',
    gsJoin: '加入游戏', gsHost: '房主', gsYou: '你',
    gsStatusLobby: '在大厅等待', gsStatusPlaying: '游戏进行中', gsStatusFinished: '已结束',
    gsResults: '最终排名', gsNoPrizes: '纯娱乐 — 没有奖品',
    gsWaiting: '等待玩家加入…', gsNeedTwo: '还差一位玩家…',
    gsStartMatch: '开始比赛', gsSpectator: '你正在观战',
    gsLive: '实时排名', gsBackToChat: '返回聊天', gsLeave: '离开',
    gsDemoSim: '演示对局 — 其他玩家由本机模拟',
    gsGameOver: '游戏结束', gsStartFailed: '无法开启游戏对局',
    compTitle: '每周比赛',
    compThisWeek: '本周主题',
    compPromptWord: '主题',
    compPrize: '奖品：✦ {n} 积分',
    compEntries: '{n} 个参赛作品', compEntriesOne: '1 个参赛作品',
    compEndsIn: '{t} 后结束',
    compYourEntry: '你已参赛 — 祝你好运！',
    compEnter: '提交这个视频',
    compPickYours: '选择你的一个 AI 视频参赛：',
    compNoAiVideos: '你还没有自己的 AI 视频 — 生成本周主题即可参赛。',
    compGenerateCta: '生成这个主题',
    compDormant: '满 {min} 位创作者开启 — 目前 {n} 位',
    compProgress: '{n} / {min} 位创作者',
    compWinner: '冠军',
    compWonWith: '以 {n} 个赞获胜',
    compPastWinners: '往期冠军',
    compNoWinnersYet: '还没有冠军 — 第一顶桂冠虚位以待。',
    compEnteredToast: '参赛成功！本周的参赛作品已锁定。',
    compDemoNote: '演示预览 — 参赛需要真实账号，比赛将在 500 位创作者时开启。',
    compLikesWord: '个赞',
    err_COMPETITIONS_NOT_ACTIVE: '比赛尚未开启。',
    err_COMPETITION_CLOSED: '本周比赛已经结束。',
    err_NOT_AI_VIDEO: '参赛作品必须是你用 AI 生成的视频。',
    err_NOT_YOUR_VIDEO: '只能提交你自己的视频。',
    err_ALREADY_ENTERED: '你本周已经参赛了。',
    startGame: '开始', playAgain: '再来一局',
    yourLevel: '你的等级', nextUnlock: '下一个解锁',
    gamePenalty: '点球大战',
    gamePenaltyBlurb: '和门将机器人来一场 5 轮点球对决。',
    gameFood: '美食忍者',
    gameFoodBlurb: '滑动切开飞舞的食物，限时比拼 — 单人对战 AI 或在线 1v1。',
    foodRules: '划过飞舞的食物将它们切开。一次滑动切中 3 个以上 = 拼盘连击奖励。攒满能量条触发 FEVER 双倍分数。千万别切臭鸡蛋！',
    pkPower: '力量',
    gamePong: '乒乓',
    gamePongBlurb: '和机器人 1v1 对打。先到 7 分获胜。',
    gameVolley: '排球对决',
    gameVolleyBlurb: '1v1 限时体育对决 — 倒计时结束时分数高者胜。',
    gameVolfield: 'Volfield',
    gameVolfieldBlurb: '与巡逻首领对决的领地占领——画线、占领 80%、躲开电流。',
    gamePoker: '扑克',
    gamePokerBlurb: '和朋友与机器人一起打休闲德州扑克。',
    pokerFreeShort: '仅限免费游戏币 — 靠玩赚取，从不出售，永不兑现。',
    penaltyRules: '5 轮定胜负，平局进入突然死亡。射门：在球门上滑动 — 你甩向哪里球就飞向哪里，全力甩向门框附近可能会飞出界。扑救：机器人射门瞬间滑动扑出 — 扑得越晚，覆盖范围越小。',
    pongRules: '先到 7 分。拖动或移动鼠标来滑动你的球拍（下方）。你每得一分，机器人就更快一点。',
    volleyTitle: '排球对决 — 1v1，限时',
    volleyRules: '60 秒限时对决。发球、垫球、扣球过网 — 倒计时归零时分数高者胜。先打赢机器人热身，再挑战朋友争夺真正的冠军。',
    volleySoon: '这款游戏还在开发中 — 球场、球网物理和限时回合将在后续更新中推出。现在发出的挑战是演示卡。',
    pokerTitle: '扑克 — 休闲牌桌',
    pokerRules: '休闲德州扑克牌桌 — 你、你的朋友和几个机器人。两张底牌，五张公共牌，最好的牌型赢走游戏币底池。',
    pokerFreeRule: '仅限免费游戏币。这里的扑克使用靠玩游戏赚取的游戏币 — 从不出售、从不购买，也永远不能兑换成积分或兑现。这是游戏，不是赌博。',
    pokerSoon: '牌桌还在开发中。现在发出的挑战是演示卡。',
    messagePlaceholder: '发消息…', commentPlaceholder: '添加评论…',
    liveChatPlaceholder: '说点什么…',
    modeDemo: '模式：演示（本机示例内容）',
    modeLive: '模式：已连接账号',
    xpToNext: '距下一等级还差 XP', maxLevel: '已达到最高等级',
    reachBoost: '推荐加成', level: '等级',
    streakDays: '天连续上传', nextBadge: '下一个徽章',
    earnTitle: '赚取 XP 的方式', badgesTitle: '徽章',
    streakRuleLabel: '连续上传奖励', milestoneLabel: '视频里程碑',
    levelUpToast: '升级了！', badgeToast: '新徽章：',
    watchingDemo: '示例直播界面 — 服务器接通 LiveKit 后显示真实直播画面。',
    liveReady: '已可连接', liveConnecting: '连接中…', liveConnected: '已连接', liveOnAir: '直播中', liveReconnecting: '重新连接中…', liveWaitingMsg: '等待主播开始视频…', liveEndedMsg: '直播已结束。', liveLostMsg: '连接已断开 — 直播可能已结束。', liveDeniedMsg: '摄像头或麦克风被拒绝，暂时无法出镜。允许访问后重新加入即可上镜。', liveUnavailableMsg: '直播视频无法在此启动 — 请检查网络后重试。', 
    interest_food: '美食', interest_music: '音乐', interest_comedy: '喜剧',
    interest_sports: '体育', interest_travel: '旅行', interest_animals: '动物',
    interest_gaming: '游戏', interest_beauty: '美妆', interest_tech: '科技',
    interest_dance: '舞蹈', interest_fitness: '健身', interest_film: '影视',
    interest_fashion: '时尚', interest_diy: '手工', interest_nature: '自然',
    interest_cars: '汽车',
    share: '\u5206\u4EAB', remix: '\u518D\u521B\u4F5C',
    adSlot: '\u5E7F\u544A\u4F4D',
    adText: '\u8FD9\u91CC\u4F1A\u4E0D\u65F6\u51FA\u73B0\u5E7F\u544A \u2014 \u8FD9\u662F LOOPI \u80FD\u514D\u8D39\u89C2\u770B\u7684\u4EA4\u6362\u6761\u4EF6\u3002',
    demoTag: '\u6F14\u793A', unknownUser: '\u672A\u77E5\u7528\u6237',
    noComments: '\u8FD8\u6CA1\u6709\u8BC4\u8BBA \u2014 \u6765\u5F00\u542F\u5BF9\u8BDD\u5427\u3002',
    shareDefaultText: '\u6765 LOOPI \u770B\u8FD9\u4E2A\u89C6\u9891',
    linkCopied: '\u94FE\u63A5\u5DF2\u590D\u5236 \u2014 \u7C98\u8D34\u5230 WhatsApp\u3001Instagram\u3001\u77ED\u4FE1\u2026',
    nothingMatches: '\u6CA1\u6709\u5339\u914D\u7ED3\u679C \u2014 \u6362\u4E2A\u8BCD\u8BD5\u8BD5\u3002',
    uploadTooLong: '\u8FD9\u4E2A\u89C6\u9891\u6709 {s} \u79D2 \u2014 LOOPI \u7684\u4E0A\u4F20\u4E0A\u9650\u662F 20 \u79D2\u3002\u526A\u77ED\u4E00\u70B9\u518D\u8BD5\u3002',
    uploadLooksGood: '\u6CA1\u95EE\u9898\uFF08{s} \u79D2\uFF09\u3002',
    uploadCaptionPh: '\u6DFB\u52A0\u8BF4\u660E\u2026',
    uploadPostBtn: '\u53D1\u5E03\u5230 LOOPI',
    uploadReadyPost: '\u5DF2\u5C31\u7EEA \u2014 \u70B9\u53D1\u5E03\uFF0C\u8BA9\u6240\u6709\u4EBA\u770B\u5230\u3002',
    uploadLocalOnly: '\u9884\u89C8\u4EC5\u5728\u672C\u673A\u3002\u767B\u5F55\u540E\u5373\u53EF\u53D1\u5E03\u7ED9\u6240\u6709\u4EBA\u3002',
    uploadingPct: '\u4E0A\u4F20\u4E2D\u2026 {p}%',
    uploadPosted: '\u5DF2\u53D1\u5E03 \u2014 \u4F60\u7684\u89C6\u9891\u5DF2\u5728 LOOPI \u4E0A\u7EBF\u3002',
    addSong: '\u6DFB\u52A0\u6B4C\u66F2',
    addSongNone: '\u4E0D\u52A0\u6B4C\u66F2',
    addSongNote: '\u53EF\u514D\u8D39\u4F7F\u7528 \u2014 \u6B4C\u66F2\u5C06\u66FF\u6362\u89C6\u9891\u7684\u539F\u58F0\u3002',
    musicUnavailable: '\u6B4C\u66F2\u6682\u65F6\u4E0D\u53EF\u7528\u3002',
    previewSong: '\u64AD\u653E\u9884\u89C8',
    stopSong: '\u505C\u6B62\u9884\u89C8',
    titleVoiceMessage: '\u8BED\u97F3\u6D88\u606F',
    voiceRecording: '\u5F55\u97F3\u4E2D\u2026',
    voiceSending: '\u6B63\u5728\u53D1\u9001\u8BED\u97F3\u6D88\u606F\u2026',
    transcribing: '\u8F6C\u5199\u4E2D\u2026',
    newPostsPill: '{count} \u6761\u65b0\u5e16\u5b50',
    voiceMicDenied: '\u9EA6\u514B\u98CE\u6743\u9650\u88AB\u62D2\u7EDD\u2014\u2014\u5141\u8BB8\u4F7F\u7528\u9EA6\u514B\u98CE\u540E\u624D\u80FD\u53D1\u9001\u8BED\u97F3\u6D88\u606F\u3002',
    voiceUnsupported: '\u6B64\u8BBE\u5907\u4E0D\u652F\u6301\u5F55\u97F3\u3002',
    voiceNeedsAccount: '\u8BED\u97F3\u6D88\u606F\u9700\u8981\u767B\u5F55\u8D26\u53F7\u3002',
    voiceSendFailed: '\u8BED\u97F3\u6D88\u606F\u53D1\u9001\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002',
    mood_upbeat: '\u6B22\u5FEB\u6D41\u884C',
    mood_chill: '\u653E\u677E',
    mood_rock: '\u6447\u6EDA',
    mood_edm: '\u7535\u5B50\u821E\u66F2',
    mood_acoustic: '\u6B22\u5FEB\u539F\u58F0',
    mood_dramatic: '\u620F\u5267',
    uploadMixingToast: '\u5DF2\u53D1\u5E03 \u2014 \u6B63\u5728\u6DFB\u52A0\u4F60\u7684\u6B4C\u66F2\uFF0C\u51E0\u79D2\u540E\u4F1A\u51FA\u73B0\u5728\u63A8\u8350\u91CC\u3002',
    uploadFailed: '\u4E0A\u4F20\u5931\u8D25\u3002\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5\u3002',
    uploadTooBig: '\u6587\u4EF6\u592A\u5927 \u2014 LOOPI \u63A5\u53D7\u6700\u5927 100 MB\u3002',
    uploadCheckingToast: '\u5DF2\u4E0A\u4F20 \u2014 \u6B63\u5728\u8FDB\u884C\u5B89\u5168\u68C0\u67E5\uFF0C\u901A\u8FC7\u540E\u4F1A\u51FA\u73B0\u5728\u63A8\u8350\u91CC\u3002',
    modChecking: '\u68C0\u67E5\u4E2D\u2026',
    modRejected: '\u672A\u901A\u8FC7',
    uploadNotVideo: '\u65E0\u6CD5\u628A\u8FD9\u4E2A\u6587\u4EF6\u8BFB\u4F5C\u89C6\u9891\u3002',
    genDescribeFirst: '\u5148\u63CF\u8FF0\u4E00\u4E0B\u89C6\u9891\uFF08\u81F3\u5C11\u51E0\u4E2A\u5B57\uFF09\u3002',
    genNeedsAccount: '\u751F\u6210\u8981\u82B1\u771F\u5B9E\u79EF\u5206\uFF0C\u6240\u4EE5\u9700\u8981\u771F\u5B9E\u8D26\u53F7 \u2014 \u4F60\u6B63\u5728\u6D4F\u89C8\u6F14\u793A\u3002\u6CE8\u518C\u540E\u5373\u53EF\u751F\u6210\u3002',
    genNotEnough: '\u79EF\u5206\u4E0D\u8DB3 \u2014 \u8FD9\u6B21\u751F\u6210\u9700\u8981 {n}\u3002\u53BB\u4E2A\u4EBA\u9875\u4E70\u4E2A\u79EF\u5206\u5305\u5427\u3002',
    genNotEnoughFull: '\u8FD9\u6B21\u751F\u6210\u7684\u79EF\u5206\u4E0D\u8DB3\u3002\u53BB\u4E2A\u4EBA\u9875\u4E70\u4E2A\u79EF\u5206\u5305\u5427\u3002',
    genDone: '\u5B8C\u6210 \u2014 \u4F60\u7684\u751F\u6210\u89C6\u9891\u5DF2\u8FDB\u5165 feed\u3002',
    genResultCaption: '\u2014 \u5DF2\u6263 {n} \u79EF\u5206\u3002\u73B0\u5728\u5DF2\u5728 feed \u4E0A\u7EBF\u3002',
    serverUnreachable: '\u670D\u52A1\u5668\u65E0\u6CD5\u8FDE\u63A5',
    serverUnreachableAuth: '\u670D\u52A1\u5668\u65E0\u6CD5\u8FDE\u63A5 \u2014 \u68C0\u67E5 API \u662F\u5426\u5728\u8FD0\u884C\uFF0C\u6216\u8005\u5148\u6D4F\u89C8\u6F14\u793A\u3002',
    genServerUnreachable: '\u670D\u52A1\u5668\u65E0\u6CD5\u8FDE\u63A5 \u2014 \u751F\u6210\u9700\u8981 API \u5728\u8FD0\u884C\u3002',
    emailPasswordRequired: '\u90AE\u7BB1\u548C\u5BC6\u7801\u662F\u5FC5\u586B\u7684\u3002',
    onboardSaveFailed: '\u4FDD\u5B58\u5931\u8D25 \u2014 \u4F60\u53EF\u4EE5\u4E4B\u540E\u5728\u4E2A\u4EBA\u8D44\u6599\u91CC\u4FEE\u6539\u5174\u8DA3\u3002',
    directMessage: '\u79C1\u4FE1',
    roomKind_dm: '\u79C1\u804A', roomKind_group: '\u7FA4\u804A', roomKind_open: '\u5F00\u653E', roomKind_private: '\u79C1\u5BC6',
    roomPasswordTag: '\u5BC6\u7801',
    noChatsYet: '\u8FD8\u6CA1\u6709\u804A\u5929 \u2014 \u5728\u4E0B\u9762\u5EFA\u4E2A\u623F\u95F4\uFF0C\u6216\u628A\u89C6\u9891\u5206\u4EAB\u7ED9\u670B\u53CB\u3002',
    roomPrivatePrompt: '\u8FD9\u662F\u79C1\u5BC6\u623F\u95F4 \u2014 \u8BF7\u8F93\u5165\u5BC6\u7801\uFF1A',
    sharedVideo: '\u5206\u4EAB\u4E86\u4E00\u4E2A\u89C6\u9891', videoWord: '\u89C6\u9891',
    roomNameRequired: '\u7ED9\u623F\u95F4\u8D77\u4E2A\u540D\u5B57\u3002',
    roomPasswordShort: '\u79C1\u5BC6\u623F\u95F4\u7684\u5BC6\u7801\u81F3\u5C11\u9700\u8981 4 \u4E2A\u5B57\u7B26\u3002',
    roomDemoCreated: '\u6F14\u793A\u623F\u95F4\u5DF2\u521B\u5EFA\uFF08\u5728\u672C\u673A\uFF09\u3002',
    roomCreated: '\u623F\u95F4\u5DF2\u521B\u5EFA\u3002',
    nobodyLive: '\u73B0\u5728\u6CA1\u4EBA\u76F4\u64AD \u2014 \u6765\u505A\u7B2C\u4E00\u4E2A\u3002',
    liveWord: '\u76F4\u64AD\u4E2D', liveBadge: '\u25CF \u76F4\u64AD\u4E2D',
    isLiveSuffix: ' \u6B63\u5728\u76F4\u64AD', theStreamer: '\u4E3B\u64AD',
    tipDemo: '\u6F14\u793A\u76F4\u64AD \u2014 \u6253\u8D4F\u9700\u8981\u771F\u5B9E\u76F4\u64AD\u548C\u5DF2\u767B\u5F55\u8D26\u53F7\u3002\u672C\u6B21\u6CA1\u6709\u6263\u8D39\u3002',
    tippedMsg: '\u4F60\u6253\u8D4F\u4E86 \u2726 {amount} \u7ED9 {who} \u2014 \u8C22\u8C22\u4F60\u7684\u652F\u6301\u3002',
    giftBtn: '礼物', giftShelfTitle: '\u9001\u793C\u7269',
    giftBalance: '\u4F60\u7684\u4F59\u989D',
    giftSentMsg: '\u4F60\u9001\u4E86 {gift} \u7ED9 {who} \u2014 \u8C22\u8C22\u4F60\u7684\u652F\u6301\u3002',
    giftEventLine: '\u9001\u4E86\u4E00\u4E2A {gift}',
    giftDemo: '\u6F14\u793A\u76F4\u64AD \u2014 \u9001\u793C\u9700\u8981\u771F\u5B9E\u76F4\u64AD\u548C\u5DF2\u767B\u5F55\u8D26\u53F7\u3002\u672C\u6B21\u6CA1\u6709\u6263\u8D39\u3002',
    giftName_rose: '\u73AB\u7470', giftName_heart: '\u7231\u5FC3', giftName_star: '\u661F\u661F', giftName_crown: '\u7687\u51A0',
    giftName_rocket: '\u706B\u7BAD', giftName_diamond: '\u94BB\u77F3', giftName_castle: '\u57CE\u5821', giftName_dragon: '\u9F99',
    goLiveNeedsAccount: '\u5F00\u59CB\u76F4\u64AD\u9700\u8981\u771F\u5B9E\u8D26\u53F7 \u2014 \u4F60\u6B63\u5728\u6D4F\u89C8\u6F14\u793A\u3002',
    youAreLive: '\u4F60\u5DF2\u5F00\u64AD \u2014 \u53EF\u4EE5\u8FDE\u63A5\u4E86\u3002',
    liveNotConfiguredMsg: '\u4F60\u7684\u76F4\u64AD\u95F4\u5DF2\u521B\u5EFA\uFF0C\u4F46\u670D\u52A1\u5668\u8FD8\u6CA1\u6709\u5F00\u542F\u76F4\u64AD\u529F\u80FD\uFF0C\u6240\u4EE5\u6682\u65F6\u6CA1\u6709\u53EF\u52A0\u5165\u7684\u76F4\u64AD\u3002\u623F\u95F4\u5DF2\u5B58\u5728\uFF1B\u670D\u52A1\u5668\u914D\u7F6E\u597D\u540E\u89C6\u9891\u5C31\u4F1A\u5F00\u59CB\u3002',
    perCreditPrice: '$2.00 / \u79EF\u5206', buy: '\u8D2D\u4E70',
    checkoutDemo: '\u6F14\u793A\u6A21\u5F0F\uFF1A\u8FD9\u91CC\u7684\u7ED3\u8D26\u4E0D\u662F\u771F\u5B9E\u7684\u3002\u5728\u6B63\u5F0F\u7248\u91CC\uFF0C\u8FD9\u4E2A\u79EF\u5206\u5305\u901A\u8FC7 Play Billing \u8D2D\u4E70\u3002',
    packStubMsg: '\u5DF2\u6DFB\u52A0 \u2726 {n} \u2014 \u8BF4\u5B9E\u8BDD\uFF1A\u8FD9\u662F\u670D\u52A1\u5668\u901A\u8FC7\u8BA1\u8D39\u6869\u53D1\u653E\u7684\u3002Play Billing \u9A8C\u8BC1\u5C1A\u672A\u63A5\u901A\uFF0C\u6240\u4EE5\u6CA1\u6709\u771F\u5B9E\u4ED8\u6B3E\u6216\u6838\u9A8C\u3002',
    packAddedMsg: '\u5DF2\u6DFB\u52A0 \u2726 {n} \u79EF\u5206\u3002',
    tagUploader: '\u4E0A\u4F20\u8005', tagExplorer: '\u63A2\u7D22\u8005',
    earlyMember: '早期成员', interestsWord: '\u4E2A\u5174\u8DA3',
    youDemoName: '\u4F60\uFF08\u6F14\u793A\uFF09',
    lvlName_starter: '\u65B0\u624B', lvlName_rising: '\u65B0\u661F', lvlName_creator: '\u521B\u4F5C\u8005',
    lvlName_procreator: '\u4E13\u4E1A\u521B\u4F5C\u8005', lvlName_starcreator: '\u660E\u661F\u521B\u4F5C\u8005',
    earnUpload: '\u4E0A\u4F20\u4E00\u4E2A\u89C6\u9891', earnGenerate: '\u7528 AI \u751F\u6210\u4E00\u4E2A\u89C6\u9891',
    earnFirstUpload: '\u7B2C\u4E00\u6B21\u4E0A\u4F20\u7684\u4E00\u6B21\u6027\u5956\u52B1',
    badge_first_upload: '\u7B2C\u4E00\u6B21\u4E0A\u4F20', badge_streak_7: '7 \u5929\u8FDE\u7EED\u4E0A\u4F20', badge_likes_100: '100 \u4E2A\u8D5E',
    badge_level_2: '\u65B0\u661F', badge_level_3: '\u521B\u4F5C\u8005', badge_level_4: '\u4E13\u4E1A\u521B\u4F5C\u8005', badge_level_5: '\u660E\u661F\u521B\u4F5C\u8005',
    metric_likes: '\u8D5E', metric_comments: '\u8BC4\u8BBA',
    youWord: '\u4F60', botWord: '\u673A\u5668\u4EBA', beatThat: '\u8C01\u80FD\u8D62\u6211\uFF01',
    coinsRewardSuffix: ' \u6E38\u620F\u5E01\u3002',
    pkResultWinText: '你赢了 {a} — {b}！+{r} 游戏币。',
    pkResultLoseText: '机器人获胜 {a} — {b}。+{r} 游戏币。',
    pongResultWinText: '你赢了 {a} — {b} · +{r} 游戏币。',
    pongResultLoseText: '机器人获胜 {a} — {b} · +{r} 游戏币。',
    pkYouFirst: '\u5148\u7531\u4F60\u5C04\u95E8 \u2014 \u5728\u7403\u95E8\u4E0A\u6ED1\u5411\u4E00\u4E2A\u89D2\u3002',
    pkFullTime: '\u5168\u573A\u7ED3\u675F', pkSuddenDeath: '\u7A81\u7136\u6B7B\u4EA1',
    pkYourShotKick: '\u4F60\u7684\u5C04\u95E8 \u00B7 \u7B2C {n} \u811A\uFF08\u5171 5 \u811A\uFF09\u2014 \u6ED1\u52A8\u5C04\u95E8',
    pkBotShootsKick: '\u673A\u5668\u4EBA\u5C04\u95E8 \u00B7 \u7B2C {n} \u811A\uFF08\u5171 5 \u811A\uFF09\u2014 \u6ED1\u52A8\u6251\u6551\uFF01',
    pkYourShotSD: '\u7A81\u7136\u6B7B\u4EA1 \u00B7 \u4F60\u7684\u5C04\u95E8 \u2014 \u6ED1\u52A8\uFF01',
    pkBotShootsSD: '\u7A81\u7136\u6B7B\u4EA1 \u00B7 \u673A\u5668\u4EBA\u5C04\u95E8 \u2014 \u6ED1\u52A8\u6251\u6551\uFF01',
    pkBotShootsMsg: '\u673A\u5668\u4EBA\u5C04\u95E8 \u2014 \u5728\u4ED6\u8D77\u811A\u65F6\u6ED1\u52A8\u6251\u6551\uFF01',
    pkYourShotMsg: '\u4F60\u7684\u5C04\u95E8 \u2014 \u6ED1\u5411\u4E00\u4E2A\u89D2\u3002',
    pkGoalMsg: '\u26BD \u8FDB\u7403\uFF01{zone}\uFF0C{pct}% \u529B\u91CF',
    pkGoalSuffixRocket: ' \u2014 \u95E8\u5C06\u6BEB\u65E0\u673A\u4F1A\u3002',
    pkGoalSuffixPlaced: ' \u2014 \u89D2\u5EA6\u6253\u5F97\u6F02\u4EAE\u3002',
    pkSavedMsg: '被扑出！门将到位了 — 你打了{zone}，{pct}% 力量。',
    pkMissOver: '打飞了！力量太大了。',
    pkMissLeft: '偏出左侧！擦着门柱飞出。',
    pkMissRight: '偏出右侧！擦着门柱飞出。',
    pkMissTurf: '打在草皮上 — 这一脚没踢起来。',
    pkMissPowerSuffix: '\uFF08{pct}% \u529B\u91CF\uFF09',
    pkYouFroze: '\u4F60\u6123\u4F4F\u4E86 \u2014 ',
    pkYouSavedIt: '你扑出去了！完全看穿了{zone}的射门。',
    pkBotScores: '\u26BD \u673A\u5668\u4EBA\u8FDB\u7403\u3002\u4ED6\u6253\u4E86{zone}\u3002',
    zone_tl: '\u5DE6\u4E0A', zone_tm: '\u4E0A\u4E2D', zone_tr: '\u53F3\u4E0A',
    zone_bl: '\u5DE6\u4E0B', zone_bm: '\u4E0B\u4E2D', zone_br: '\u53F3\u4E0B',
    poBotMatch: '机器人对战', poOnlineMatch: '和朋友玩 · 在线 1v1',
    poCreateRoom: '\u521B\u5EFA\u623F\u95F4', poQuickMatch: '\u26A1 \u5FEB\u901F\u5339\u914D',
    poJoinRoom: '\u52A0\u5165\u623F\u95F4', poLeaveMatch: '\u79BB\u5F00\u6BD4\u8D5B',
    poRoomWord: '\u623F\u95F4', poSendCode: ' \u2014 \u628A\u8FD9\u4E2A\u4EE3\u7801\u53D1\u7ED9\u4F60\u7684\u670B\u53CB',
    codePlaceholder: '\u4EE3\u7801',
    fnVsAi: '对战 AI', fnOnline: '在线 1v1',
    diffEasy: '\u7B80\u5355', diffNormal: '\u666E\u901A', diffHard: '\u56F0\u96BE',
    feverTag: 'FEVER ×2',
    appTitle: 'LOOPI \u2014 \u89C2\u770B\u3001\u4E0A\u4F20\u3001\u751F\u6210',
    placeholderHandle: '\u4F60\u7684\u7528\u6237\u540D',
    ariaProfile: '\u6211\u7684', ariaBack: '\u8FD4\u56DE', ariaClose: '\u5173\u95ED', ariaCreate: '\u521B\u4F5C',
    titleShareVideo: '\u5206\u4EAB\u89C6\u9891', titleGroupGame: '\u5F00\u4E00\u573A\u7FA4\u6E38\u620F',
    gsCode: '\u623F\u95F4\u7801',
    err_OFFLINE: '\u670D\u52A1\u5668\u65E0\u6CD5\u8FDE\u63A5\u3002',
    err_INSUFFICIENT_CREDITS: '\u79EF\u5206\u4E0D\u8DB3\u3002',
    err_GENERATION_NOT_CONFIGURED: '\u670D\u52A1\u5668\u8FD8\u6CA1\u6709\u5F00\u542F AI \u751F\u6210\u3002\u672C\u6B21\u6CA1\u6709\u6263\u8D39\u3002',
    err_BILLING_NOT_CONFIGURED: '\u670D\u52A1\u5668\u8FD8\u6CA1\u6709\u5F00\u542F\u79EF\u5206\u8D2D\u4E70 \u2014 \u8BA1\u8D39\u5C1A\u672A\u914D\u7F6E\u3002',
    err_BILLING_MISCONFIGURED: '\u670D\u52A1\u5668\u7684\u8BA1\u8D39\u914D\u7F6E\u6709\u8BEF\u3002\u8BF7\u7A0D\u540E\u518D\u8BD5\u3002',
    err_LIVE_NOT_CONFIGURED: '\u670D\u52A1\u5668\u8FD8\u6CA1\u6709\u5F00\u542F\u76F4\u64AD\u529F\u80FD\u3002',
    err_CANNOT_TIP_SELF: '\u4E0D\u80FD\u7ED9\u81EA\u5DF1\u6253\u8D4F\u3002',
    err_INVALID_TIP_AMOUNT: '\u6253\u8D4F\u91D1\u989D\u65E0\u6548\u3002',
    err_CANNOT_GIFT_SELF: '\u4E0D\u80FD\u7ED9\u81EA\u5DF1\u9001\u793C\u3002',
    err_INVALID_GIFT: '\u672A\u77E5\u793C\u7269\u3002',
    err_STREAM_ENDED: '\u8FD9\u573A\u76F4\u64AD\u5DF2\u7ECF\u7ED3\u675F\u3002',
    err_UNKNOWN_PRODUCT: '\u672A\u77E5\u7684\u79EF\u5206\u5305\u3002',
    err_PURCHASE_ALREADY_PROCESSED: '\u8FD9\u7B14\u8D2D\u4E70\u5DF2\u7ECF\u5904\u7406\u8FC7\u4E86\u3002',
    err_PURCHASE_NOT_COMPLETED: '\u8FD9\u7B14\u8D2D\u4E70\u6CA1\u6709\u5B8C\u6210\u3002',
    err_PURCHASE_NOT_FOUND: '\u627E\u4E0D\u5230\u8FD9\u7B14\u8D2D\u4E70\u3002',
    err_PURCHASE_TOKEN_REQUIRED: '\u9700\u8981\u8D2D\u4E70\u51ED\u8BC1\u3002',
    err_PURCHASE_VERIFICATION_FAILED: '\u8FD9\u7B14\u8D2D\u4E70\u65E0\u6CD5\u9A8C\u8BC1\u3002',
    err_BILLING_UPSTREAM_ERROR: '\u8BA1\u8D39\u670D\u52A1\u6682\u65F6\u65E0\u6CD5\u8FDE\u63A5\u3002\u8BF7\u7A0D\u540E\u518D\u8BD5\u3002',
    err_GENERATION_FAILED: '\u751F\u6210\u5931\u8D25 \u2014 \u79EF\u5206\u5DF2\u9000\u8FD8\u3002',
    err_PASSWORD_CONFIRMATION_FAILED: '\u5BC6\u7801\u4E0D\u6B63\u786E \u2014 \u8D26\u53F7\u672A\u88AB\u5220\u9664\u3002',
    err_GAME_HUB_UNAVAILABLE: '\u6E38\u620F\u6682\u65F6\u4E0D\u53EF\u7528\u3002',
    pongWin: '你赢了', pongLose: '\u673A\u5668\u4EBA\u83B7\u80DC', ariaNewMessage: '\u65B0\u6D88\u606F',
    notifications: '\u901A\u77E5', notifTitle: '\u901A\u77E5',
    notifEmpty: '\u6682\u65F6\u6CA1\u6709\u901A\u77E5\u2014\u2014\u5173\u6CE8\u3001\u8BF7\u6C42\u3001\u6D88\u606F\u548C\u70B9\u8D5E\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002',
    notifMarkAllRead: '\u5168\u90E8\u6807\u4E3A\u5DF2\u8BFB',
    follow: '\u5173\u6CE8', followingBtn: '\u5DF2\u5173\u6CE8', requestedBtn: '\u5DF2\u8BF7\u6C42',
    approve: '\u540C\u610F', decline: '\u62D2\u7EDD',
    ntf_follow_request: '{name} \u60F3\u5173\u6CE8\u4F60',
    ntf_follow_accepted: '{name} \u5DF2\u540C\u610F\u4F60\u7684\u5173\u6CE8\u8BF7\u6C42',
    ntf_new_follower: '{name} \u5F00\u59CB\u5173\u6CE8\u4F60',
    ntf_message: '{name} \u7ED9\u4F60\u53D1\u4E86\u6D88\u606F',
    ntf_like: '{name} \u8D5E\u4E86\u4F60\u7684\u89C6\u9891',
    ntf_comment: '{name} \u8BC4\u8BBA\u4E86\u4F60\u7684\u89C6\u9891',
    ntf_live_started: '{name} \u5F00\u64AD\u4E86',
    ntf_game_invite: '{name} \u53D1\u8D77\u4E86\u4E00\u573A\u7FA4\u6E38\u620F',
    ntf_competition_result: '\u4F60\u8D62\u5F97\u4E86\u6BCF\u5468\u6BD4\u8D5B\uFF01\u2726 {n} \u79EF\u5206\u5DF2\u5230\u8D26\u3002',
    privacyTitle: '\u8D26\u53F7\u9690\u79C1',
    privacyPublic: '\u516C\u5F00', privacyPrivate: '\u79C1\u5BC6',
    privacyPublicNote: '\u4EFB\u4F55\u4EBA\u90FD\u53EF\u4EE5\u67E5\u770B\u4F60\u7684\u4E3B\u9875\u548C\u89C6\u9891\uFF0C\u5E76\u7ACB\u5373\u5173\u6CE8\u4F60\u3002',
    privacyPrivateNote: '\u53EA\u6709\u4F60\u6279\u51C6\u7684\u5173\u6CE8\u8005\u624D\u80FD\u770B\u4F60\u7684\u89C6\u9891\u548C\u5B8C\u6574\u4E3B\u9875\u3002\u5173\u6CE8\u4F1A\u5148\u53D8\u6210\u8BF7\u6C42\uFF0C\u7531\u4F60\u6279\u51C6\u6216\u62D2\u7EDD\u3002',
    privateAccount: '\u8FD9\u662F\u4E00\u4E2A\u79C1\u5BC6\u8D26\u53F7',
    followToSee: '\u5173\u6CE8\u6B64\u8D26\u53F7\u540E\u5373\u53EF\u89C2\u770B\u4ED6\u7684\u89C6\u9891\u3002',
    notifPrefsTitle: '\u901A\u77E5',
    notifPrefsNote: '\u9009\u62E9\u54EA\u4E9B\u901A\u77E5\u8FDB\u5165\u6536\u4EF6\u7BB1\u3002\u5173\u95ED\u7684\u7C7B\u578B\u6C38\u8FDC\u4E0D\u4F1A\u751F\u6210\u3002',
    npref_follow_request: '\u5173\u6CE8\u8BF7\u6C42', npref_follow_accepted: '\u8BF7\u6C42\u88AB\u540C\u610F',
    npref_new_follower: '\u65B0\u5173\u6CE8\u8005', npref_message: '\u6D88\u606F', npref_like: '\u70B9\u8D5E',
    npref_comment: '\u8BC4\u8BBA', npref_live_started: '\u5F00\u64AD\u63D0\u9192', npref_game_invite: '\u6E38\u620F\u9080\u8BF7',
    npref_competition_result: '\u6BD4\u8D5B\u7ED3\u679C',
    followersWord: '\u5173\u6CE8\u8005', followingWord: '\u6B63\u5728\u5173\u6CE8',
    creatorVideos: '\u89C6\u9891',
    requestSentToast: '\u8BF7\u6C42\u5DF2\u53D1\u9001\u2014\u2014\u9700\u8981 {name} \u6279\u51C6\u3002',
    followingToast: '\u4F60\u5DF2\u5173\u6CE8 {name}\u3002',
    unfollowedToast: '\u5DF2\u53D6\u6D88\u5173\u6CE8 {name}\u3002',
    requestApprovedToast: '{name} \u73B0\u5728\u662F\u4F60\u7684\u5173\u6CE8\u8005\u3002',
    requestDeclinedToast: '\u5DF2\u62D2\u7EDD\u8BF7\u6C42\u3002',
    privacySavedToast: '\u9690\u79C1\u8BBE\u7F6E\u5DF2\u66F4\u65B0\u3002',
    err_ACCOUNT_PRIVATE: '\u8FD9\u662F\u4E00\u4E2A\u79C1\u5BC6\u8D26\u53F7\u3002',  },
  hi: {
    tagline: '\u0926\u0947\u0916\u094B\u0964 \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u094B\u0964 \u092C\u0928\u093E\u0913\u0964',
    login: '\u0932\u0949\u0917 \u0907\u0928',
    signup: '\u0938\u093E\u0907\u0928 \u0905\u092A',
    displayName: '\u0921\u093F\u0938\u094D\u092A\u094D\u0932\u0947 \u0928\u093E\u092E',
    handle: '\u0939\u0948\u0902\u0921\u0932',
    email: '\u0908\u092E\u0947\u0932',
    password: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921',
    or: '\u092F\u093E',
    browseDemo: '\u092A\u0939\u0932\u0947 \u0921\u0947\u092E\u094B \u0926\u0947\u0916\u0947\u0902',
    authNote: '\u0921\u0947\u092E\u094B \u092E\u094B\u0921 \u0907\u0938 \u0921\u093F\u0935\u093E\u0907\u0938 \u092A\u0930 \u0938\u0948\u0902\u092A\u0932 \u0915\u0902\u091F\u0947\u0902\u091F \u0907\u0938\u094D\u0924\u0947\u092E\u093E\u0932 \u0915\u0930\u0924\u093E \u0939\u0948\u0964 \u0905\u0915\u093E\u0909\u0902\u091F \u0905\u0938\u0932\u0940 LOOPI \u0938\u0930\u094D\u0935\u0930 \u0907\u0938\u094D\u0924\u0947\u092E\u093E\u0932 \u0915\u0930\u0924\u093E \u0939\u0948\u0964',
    pickInterests: '\u0906\u092A\u0915\u0940 \u092A\u0938\u0902\u0926 \u0915\u094D\u092F\u093E \u0939\u0948?',
    pickInterestsSub: '\u0915\u0941\u091B \u091A\u0941\u0928\u0947\u0902 \u2014 \u0906\u092A\u0915\u093E For You \u092B\u093C\u0940\u0921 \u0907\u0928\u094D\u0939\u0940\u0902 \u0915\u0947 \u0939\u093F\u0938\u093E\u092C \u0938\u0947 \u0916\u0941\u0926 \u0915\u094B \u0922\u093E\u0932\u0924\u093E \u0939\u0948\u0964',
    continue: '\u0906\u0917\u0947 \u092C\u0922\u093C\u0947\u0902',
    skip: '\u0905\u092D\u0940 \u091B\u094B\u0921\u093C\u0947\u0902',
    demoBanner: '\u0921\u0947\u092E\u094B \u0915\u0902\u091F\u0947\u0902\u091F \u2014 \u0932\u093E\u0907\u0935 \u092B\u093C\u0940\u0921 \u0915\u0947 \u0932\u093F\u090F \u0938\u0930\u094D\u0935\u0930 \u0938\u0947 \u0915\u0928\u0947\u0915\u094D\u091F \u0915\u0930\u0947\u0902',
    send: '\u092D\u0947\u091C\u0947\u0902',
    discover: '\u0921\u093F\u0938\u094D\u0915\u0935\u0930',
    searchNote: '\u090F\u0915\u094D\u0938\u092A\u094D\u0932\u094B\u0930 \u0938\u094D\u0915\u094D\u0935\u0947\u092F\u0930 \u0935\u0947 \u0915\u094D\u0930\u093F\u090F\u091F\u0930 \u0939\u0948\u0902 \u091C\u093F\u0928\u094D\u0939\u0947\u0902 \u0906\u092A \u092B\u093C\u0949\u0932\u094B \u0928\u0939\u0940\u0902 \u0915\u0930\u0924\u0947\u0964 \u0915\u093F\u0938\u0940 \u092A\u0930 \u091F\u0948\u092A \u0915\u0930\u0947\u0902 \u0914\u0930 \u0938\u0940\u0927\u0947 \u0909\u0928\u0915\u0947 \u0935\u0940\u0921\u093F\u092F\u094B \u092A\u0930 \u091C\u093E\u090F\u0902\u0964',
    searchPlaceholder: '\u0935\u0940\u0921\u093F\u092F\u094B, \u0932\u094B\u0917, \u0930\u0942\u092E, \u0939\u0948\u0936\u091F\u0948\u0917 \u0916\u094B\u091C\u0947\u0902\u2026',
    live: '\u0932\u093E\u0907\u0935',
    goLive: '\u0932\u093E\u0907\u0935 \u091C\u093E\u090F\u0902',
    liveNow: '\u0905\u092D\u0940 \u0932\u093E\u0907\u0935',
    inbox: '\u0907\u0928\u092C\u0949\u0915\u094D\u0938',
    newRoom: '+ \u0928\u092F\u093E \u0930\u0942\u092E',
    roomName: '\u0930\u0942\u092E \u0915\u093E \u0928\u093E\u092E',
    roomType: '\u091F\u093E\u0907\u092A',
    roomGroup: '\u0917\u094D\u0930\u0941\u092A \u091A\u0948\u091F',
    roomOpen: '\u0913\u092A\u0928 \u0930\u0942\u092E',
    roomPrivate: '\u092A\u094D\u0930\u093E\u0907\u0935\u0947\u091F (\u092A\u093E\u0938\u0935\u0930\u094D\u0921)',
    roomPassword: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921',
    createRoom: '\u0930\u0942\u092E \u092C\u0928\u093E\u090F\u0902',
    profile: '\u092A\u094D\u0930\u094B\u092B\u093C\u093E\u0907\u0932',
    credits: '\u0915\u094D\u0930\u0947\u0921\u093F\u091F',
    balance: '\u092C\u0948\u0932\u0947\u0902\u0938',
    videosWord: '\u0935\u0940\u0921\u093F\u092F\u094B',
    shopCredits: '\u0936\u0949\u092A / \u0915\u094D\u0930\u0947\u0921\u093F\u091F',
    earnings: '\u0915\u092E\u093E\u0908',
    earningsNote: '\u0906\u092A\u0915\u094B \u092E\u093F\u0932\u0940 \u091F\u093F\u092A\u094D\u0938, \u092A\u0947\u0906\u0909\u091F \u0915\u0947 \u0932\u093F\u090F \u0905\u0932\u0917 \u0938\u0947 \u091F\u094D\u0930\u0948\u0915 \u0915\u0940 \u091C\u093E\u0924\u0940 \u0939\u0948\u0902\u0964',
    creditsForLine: '\u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0938\u0947 AI \u0935\u0940\u0921\u093F\u092F\u094B \u091C\u0947\u0928\u0930\u0947\u0936\u0928 \u0914\u0930 \u0938\u094D\u091F\u094D\u0930\u0940\u092E\u0930\u094D\u0938 \u0915\u094B \u091F\u093F\u092A\u094D\u0938 \u091A\u0932\u0924\u0947 \u0939\u0948\u0902\u0964',
    buyCredits: '\u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0916\u0930\u0940\u0926\u0947\u0902',
    topUp: '\u091F\u0949\u092A \u0905\u092A',
    currentBalance: '\u092E\u094C\u091C\u0942\u0926\u093E \u092C\u0948\u0932\u0947\u0902\u0938',
    creditsNeeded: '\u0907\u0938 \u0935\u0940\u0921\u093F\u092F\u094B \u0915\u0947 \u0932\u093F\u090F {n} \u0915\u094D\u0930\u0947\u0921\u093F\u091F \u091A\u093E\u0939\u093F\u090F\u0964',
    editProfile: '\u092A\u094D\u0930\u094B\u092B\u093C\u093E\u0907\u0932 \u090F\u0921\u093F\u091F \u0915\u0930\u0947\u0902',
    messageVerb: '\u092E\u0948\u0938\u0947\u091C',
    bioWord: '\u092C\u093E\u092F\u094B',
    profileUpdated: '\u092A\u094D\u0930\u094B\u092B\u093C\u093E\u0907\u0932 \u0905\u092A\u0921\u0947\u091F \u0939\u094B \u0917\u0908\u0964',
    peopleEmpty: '\u0905\u092D\u0940 \u0926\u093F\u0916\u093E\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0915\u094B\u0908 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964',
    noVideosYet: '\u0905\u092D\u0940 \u0915\u094B\u0908 \u0935\u0940\u0921\u093F\u092F\u094B \u0928\u0939\u0940\u0902 \u0939\u0948\u0964',
    saveChanges: '\u092C\u0926\u0932\u093E\u0935 \u0938\u0947\u0935 \u0915\u0930\u0947\u0902',
    searchWord: '\u0916\u094B\u091C\u0947\u0902',
    bioTitle: '\u092C\u093E\u092F\u094B\u092E\u0947\u091F\u094D\u0930\u093F\u0915 \u0905\u0928\u0932\u0949\u0915',
    bioUnlock: '\u092B\u093C\u093F\u0902\u0917\u0930\u092A\u094D\u0930\u093F\u0902\u091F \u0938\u0947 \u0905\u0928\u0932\u0949\u0915 \u0915\u0930\u0947\u0902',
    bioNote: '\u0906\u092A\u0915\u093E \u0938\u0947\u0936\u0928 \u0907\u0938 \u092B\u093C\u094B\u0928 \u092A\u0930 Android Keystore \u0938\u0947 \u0938\u0940\u0932 \u0915\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948\u0964 \u0905\u0917\u0930 \u092C\u093E\u092F\u094B\u092E\u0947\u091F\u094D\u0930\u093F\u0915 \u0905\u0928\u0932\u0949\u0915 \u0928 \u0939\u094B, \u0924\u094B \u0905\u092A\u0928\u093E \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0907\u0938\u094D\u0924\u0947\u092E\u093E\u0932 \u0915\u0930\u0947\u0902\u0964',
    bioEnabled: '\u0907\u0938 \u092B\u093C\u094B\u0928 \u0915\u0947 \u0932\u093F\u090F \u092C\u093E\u092F\u094B\u092E\u0947\u091F\u094D\u0930\u093F\u0915 \u0905\u0928\u0932\u0949\u0915 \u091A\u093E\u0932\u0942 \u0939\u0948\u0964',
    bioDisabled: '\u092C\u093E\u092F\u094B\u092E\u0947\u091F\u094D\u0930\u093F\u0915 \u0905\u0928\u0932\u0949\u0915 \u092C\u0902\u0926 \u0939\u0948\u0964',
    bioFailed: '\u092C\u093E\u092F\u094B\u092E\u0947\u091F\u094D\u0930\u093F\u0915 \u0905\u0928\u0932\u0949\u0915 \u092A\u0942\u0930\u093E \u0928\u0939\u0940\u0902 \u0939\u0941\u0906\u0964',
    howLevels: '\u0932\u0947\u0935\u0932 \u0915\u0948\u0938\u0947 \u0915\u093E\u092E \u0915\u0930\u0924\u0947 \u0939\u0948\u0902',
    howLevelsSub: '\u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u0928\u0947 \u0938\u0947 XP \u092E\u093F\u0932\u0924\u093E \u0939\u0948\u0964 \u090A\u0902\u091A\u093E \u0932\u0947\u0935\u0932 = \u0938\u092C\u0915\u0947 \u092B\u093C\u0940\u0921 \u092E\u0947\u0902 \u092C\u0921\u093C\u0940 \u0936\u0941\u0930\u0941\u0906\u0924\u0940 \u0930\u0940\u091A \u092C\u0942\u0938\u094D\u091F\u0964 \u0932\u0947\u0935\u0932 \u0915\u092D\u0940 \u0938\u0940\u0927\u0947 \u0935\u094D\u092F\u0942\u091C\u093C \u0928\u0939\u0940\u0902 \u0916\u0930\u0940\u0926\u0924\u0947 \u2014 \u0935\u0949\u091A \u091F\u093E\u0907\u092E \u0939\u0940 \u092B\u093C\u0948\u0938\u0932\u093E \u0915\u0930\u0924\u093E \u0939\u0948\u0964',
    logout: '\u0932\u0949\u0917 \u0906\u0909\u091F',
    settings: 'सेटिंग्स',
    settingsTitle: '\u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938',
    language: '\u092D\u093E\u0937\u093E',
    languageNote: '\u092A\u0942\u0930\u0947 \u0910\u092A \u092A\u0930 \u0924\u0941\u0930\u0902\u0924 \u0932\u093E\u0917\u0942 \u0939\u094B\u0924\u093E \u0939\u0948\u0964',
    about: '\u0910\u092A \u0915\u0947 \u092C\u093E\u0930\u0947 \u092E\u0947\u0902',
    aboutText: '\u0905\u092A\u0932\u094B\u0921-\u092B\u093C\u0930\u094D\u0938\u094D\u091F \u0936\u0949\u0930\u094D\u091F \u0935\u0940\u0921\u093F\u092F\u094B\u0964 AI \u091C\u0947\u0928\u0930\u0947\u0936\u0928 \u0905\u0902\u0926\u0930 \u0915\u093E \u092C\u0938 \u090F\u0915 \u0911\u092A\u094D\u0936\u0928 \u0939\u0948 \u2014 \u092A\u0942\u0930\u093E \u0910\u092A \u0915\u092D\u0940 \u0928\u0939\u0940\u0902\u0964',
    dangerZone: '\u0921\u0947\u0902\u091C\u0930 \u091C\u093C\u094B\u0928',
    deleteAccount: '\u0905\u0915\u093E\u0909\u0902\u091F \u0921\u093F\u0932\u0940\u091F \u0915\u0930\u0947\u0902',
    deleteAccountNote: '\u0905\u092A\u0928\u093E \u0905\u0915\u093E\u0909\u0902\u091F \u0914\u0930 \u0909\u0938\u092E\u0947\u0902 \u0938\u092C \u0915\u0941\u091B \u0939\u092E\u0947\u0936\u093E \u0915\u0947 \u0932\u093F\u090F \u0921\u093F\u0932\u0940\u091F \u0915\u0930\u0947\u0902\u0964 \u092F\u0939 \u0935\u093E\u092A\u0938 \u0928\u0939\u0940\u0902 \u0939\u094B \u0938\u0915\u0924\u093E\u0964',
    deleteAccountWarn: '\u0907\u0938\u0938\u0947 \u0906\u092A\u0915\u093E \u0905\u0915\u093E\u0909\u0902\u091F, \u0906\u092A\u0915\u0947 \u0935\u0940\u0921\u093F\u092F\u094B, \u0915\u094D\u0930\u0947\u0921\u093F\u091F, \u0915\u092E\u093E\u0908, \u092E\u0948\u0938\u0947\u091C \u0914\u0930 \u0915\u094D\u0930\u093F\u090F\u091F\u0930 \u092A\u094D\u0930\u0917\u0924\u093F \u0939\u092E\u0947\u0936\u093E \u0915\u0947 \u0932\u093F\u090F \u0921\u093F\u0932\u0940\u091F \u0939\u094B \u091C\u093E\u090F\u0917\u0940\u0964 \u0915\u094B\u0908 \u0905\u0902\u0921\u0942 \u0928\u0939\u0940\u0902 \u0939\u0948 \u0914\u0930 \u0915\u094B\u0908 \u0930\u093F\u0915\u0935\u0930\u0940 \u0928\u0939\u0940\u0902\u0964',
    deletePasswordLabel: '\u092A\u0915\u094D\u0915\u093E \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0905\u092A\u0928\u093E \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0921\u093E\u0932\u0947\u0902',
    deletePasswordPlaceholder: '\u0906\u092A\u0915\u093E \u092A\u093E\u0938\u0935\u0930\u094D\u0921',
    deleteConfirm: '\u0939\u092E\u0947\u0936\u093E \u0915\u0947 \u0932\u093F\u090F \u0921\u093F\u0932\u0940\u091F \u0915\u0930\u0947\u0902',
    deletePasswordRequired: '\u0905\u0915\u093E\u0909\u0902\u091F \u0921\u093F\u0932\u0940\u091F \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0905\u092A\u0928\u093E \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0921\u093E\u0932\u0947\u0902\u0964',
    accountDeleted: '\u0906\u092A\u0915\u093E \u0905\u0915\u093E\u0909\u0902\u091F \u0921\u093F\u0932\u0940\u091F \u0939\u094B \u0917\u092F\u093E \u0939\u0948\u0964',
    deleteNeedsAccount: '\u0921\u0947\u092E\u094B \u0905\u0915\u093E\u0909\u0902\u091F \u092E\u0947\u0902 \u0921\u093F\u0932\u0940\u091F \u0915\u0930\u0928\u0947 \u0915\u094B \u0915\u0941\u091B \u0928\u0939\u0940\u0902 \u0939\u0948 \u2014 \u092A\u0939\u0932\u0947 \u0905\u0938\u0932\u0940 \u0905\u0915\u093E\u0909\u0902\u091F \u0938\u0947 \u0938\u093E\u0907\u0928 \u0907\u0928 \u0915\u0930\u0947\u0902\u0964',
    shareWhich: '\u0915\u094C\u0928 \u0938\u093E \u0935\u0940\u0921\u093F\u092F\u094B \u0936\u0947\u092F\u0930 \u0915\u0930\u0947\u0902?',
    comments: '\u0915\u092E\u0947\u0902\u091F',
    create: '\u092C\u0928\u093E\u090F\u0902',
    recordUpload: '\u0930\u093F\u0915\u0949\u0930\u094D\u0921 / \u0905\u092A\u0932\u094B\u0921',
    uploadNote: '\u0906\u092A\u0915\u093E \u0905\u092A\u0928\u093E \u0935\u0940\u0921\u093F\u092F\u094B, 20 \u0938\u0947\u0915\u0902\u0921 \u0924\u0915\u0964',
    generateAi: 'AI \u0938\u0947 \u092C\u0928\u093E\u090F\u0902',
    generateNote: '\u092C\u0924\u093E\u090F\u0902 \u0915\u0948\u0938\u093E \u091A\u093E\u0939\u093F\u090F \u2014 AI \u092C\u0928\u093E \u0926\u0947\u0917\u093E\u0964 \u0915\u0940\u092E\u0924 \u0939\u092E\u0947\u0936\u093E \u092C\u091F\u0928 \u092A\u0930 \u0926\u093F\u0916\u0924\u0940 \u0939\u0948\u0964',
    promptPlaceholder: '\u0930\u093E\u0924 \u092E\u0947\u0902 \u0928\u0940\u092F\u0928 \u091F\u094B\u0915\u094D\u092F\u094B \u092E\u0947\u0902 \u0938\u094D\u0915\u0947\u091F\u092C\u094B\u0930\u094D\u0921 \u0915\u0930\u0924\u093E \u090F\u0915 \u092A\u093E\u0902\u0921\u093E\u2026',
    oneCredit: '1 \u0915\u094D\u0930\u0947\u0921\u093F\u091F',
    twoCredits: '2 \u0915\u094D\u0930\u0947\u0921\u093F\u091F',
    generate: '\u092C\u0928\u093E\u090F\u0902',
    tipNote: '\u091F\u093F\u092A\u094D\u0938 \u0938\u094D\u091F\u094D\u0930\u0940\u092E\u0930 \u0915\u094B \u091C\u093E\u0924\u0940 \u0939\u0948\u0902',
    tabHome: '\u0939\u094B\u092E',
    tabDiscover: '\u0921\u093F\u0938\u094D\u0915\u0935\u0930',
    tabLive: '\u0932\u093E\u0907\u0935',
    tabInbox: '\u0907\u0928\u092C\u0949\u0915\u094D\u0938',
    tabGames: '\u0917\u0947\u092E\u094D\u0938',
    games: '\u0917\u0947\u092E\u094D\u0938',
    tabFeed: '\u092B\u093C\u0940\u0921',
    tabArena: '\u090F\u0930\u0940\u0928\u093E',
    tabChat: '\u091A\u0948\u091F',
    following: '\u092B\u093C\u0949\u0932\u094B\u0907\u0902\u0917',
    forYou: 'For You',
    filmed: 'FILMED',
    originalSound: '\u0913\u0930\u093F\u091C\u093F\u0928\u0932 \u0938\u093E\u0909\u0902\u0921',
    ariaSearch: '\u0916\u094B\u091C\u0947\u0902',
    gamesNote: '\u091B\u094B\u091F\u0947 \u0917\u0947\u092E\u094D\u0938, \u092C\u0921\u093C\u0947 \u0936\u0947\u0916\u093C\u0940 \u0915\u0947 \u0939\u0915\u093C\u0964 \u0926\u094B\u0938\u094D\u0924 \u0915\u094B \u091A\u0948\u0932\u0947\u0902\u091C \u0915\u0930\u0947\u0902 \u0914\u0930 \u0915\u093E\u0930\u094D\u0921 \u0938\u0940\u0927\u0947 \u0906\u092A\u0915\u0940 \u091A\u0948\u091F \u092E\u0947\u0902 \u0906 \u091C\u093E\u090F\u0917\u093E\u0964',
    gameCoins: '\u0917\u0947\u092E \u0915\u0949\u0907\u0928\u094D\u0938',
    coinsNote: '\u0917\u0947\u092E \u0915\u0949\u0907\u0928\u094D\u0938 \u0916\u0947\u0932\u0915\u0930 \u0915\u092E\u093E\u090F \u091C\u093E\u0924\u0947 \u0939\u0948\u0902 \u2014 \u0915\u092D\u0940 \u0916\u0930\u0940\u0926\u0947 \u0928\u0939\u0940\u0902 \u091C\u093E\u0924\u0947\u0964 \u092F\u0947 \u090F\u0915 \u0905\u0932\u0917 \u0917\u0947\u092E\u094D\u0938 \u0915\u0930\u0947\u0902\u0938\u0940 \u0939\u0948\u0902 \u0914\u0930 \u0915\u092D\u0940 \u0915\u094D\u0930\u0947\u0921\u093F\u091F \u092F\u093E \u0915\u0948\u0936 \u092E\u0947\u0902 \u0928\u0939\u0940\u0902 \u092C\u0926\u0932\u0924\u0947\u0964',
    challengeFriend: '\u0926\u094B\u0938\u094D\u0924 \u0915\u094B \u091A\u0948\u0932\u0947\u0902\u091C \u0915\u0930\u0947\u0902',
    play: '\u0916\u0947\u0932\u0947\u0902',
    locked: '\u0932\u0949\u0915 \u0939\u0948',
    inBuild: '\u092C\u0928 \u0930\u0939\u093E \u0939\u0948',
    unlocksAt: '\u0905\u0928\u0932\u0949\u0915 \u0939\u094B\u0917\u093E Level',
    xpToGo: 'XP \u092C\u093E\u0915\u0940',
    leaderboard: '\u0932\u0940\u0921\u0930\u092C\u094B\u0930\u094D\u0921',
    wins: '\u091C\u0940\u0924',
    challengeWhich: '\u0915\u093F\u0938 \u091A\u0948\u091F \u092E\u0947\u0902 \u091A\u0948\u0932\u0947\u0902\u091C \u0915\u0930\u0947\u0902?',
    cancel: '\u0915\u0948\u0902\u0938\u093F\u0932',
    challengeTitle: '\u0917\u0947\u092E \u091A\u0948\u0932\u0947\u0902\u091C',
    challengeSent: '\u091A\u0948\u0932\u0947\u0902\u091C \u092D\u0947\u091C\u093E \u0917\u092F\u093E',
    challengeDefault: '\u092E\u0948\u0902 \u0924\u0941\u092E\u094D\u0939\u0947\u0902 \u090F\u0915 \u092E\u0948\u091A \u0915\u0947 \u0932\u093F\u090F \u091A\u0948\u0932\u0947\u0902\u091C \u0915\u0930\u0924\u093E \u0939\u0942\u0902!',
    acceptChallenge: '\u0938\u094D\u0935\u0940\u0915\u093E\u0930 \u0915\u0930\u0947\u0902',
    gsGroupGame: '\u0917\u094D\u0930\u0941\u092A \u0917\u0947\u092E',
    gsSessionBy: '\u0928\u0947 \u0917\u094D\u0930\u0941\u092A \u0917\u0947\u092E \u0936\u0941\u0930\u0942 \u0915\u093F\u092F\u093E',
    gsJoin: '\u0917\u0947\u092E \u091C\u0949\u0907\u0928 \u0915\u0930\u0947\u0902',
    gsHost: '\u0939\u094B\u0938\u094D\u091F',
    gsYou: '\u0906\u092A',
    gsStatusLobby: '\u0932\u0949\u092C\u0940 \u092E\u0947\u0902',
    gsStatusPlaying: '\u0905\u092D\u0940 \u0916\u0947\u0932 \u0930\u0939\u0947 \u0939\u0948\u0902',
    gsStatusFinished: '\u0916\u093C\u0924\u094D\u092E',
    gsResults: '\u092B\u093C\u093E\u0907\u0928\u0932 \u0938\u094D\u091F\u0948\u0902\u0921\u093F\u0902\u0917',
    gsNoPrizes: '\u092C\u0938 \u092E\u091C\u093C\u0947 \u0915\u0947 \u0932\u093F\u090F \u2014 \u0915\u094B\u0908 \u0907\u0928\u093E\u092E \u0928\u0939\u0940\u0902',
    gsWaiting: '\u0916\u093F\u0932\u093E\u0921\u093C\u093F\u092F\u094B\u0902 \u0915\u093E \u0907\u0902\u0924\u091C\u093C\u093E\u0930\u2026',
    gsNeedTwo: '\u090F\u0915 \u0914\u0930 \u0916\u093F\u0932\u093E\u0921\u093C\u0940 \u0915\u093E \u0907\u0902\u0924\u091C\u093C\u093E\u0930\u2026',
    gsStartMatch: '\u092E\u0948\u091A \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902',
    gsSpectator: '\u0906\u092A \u0926\u0930\u094D\u0936\u0915 \u0915\u0947 \u0930\u0942\u092A \u092E\u0947\u0902 \u0926\u0947\u0916 \u0930\u0939\u0947 \u0939\u0948\u0902',
    gsLive: '\u0932\u093E\u0907\u0935 \u0938\u094D\u091F\u0948\u0902\u0921\u093F\u0902\u0917',
    gsBackToChat: '\u091A\u0948\u091F \u092A\u0930 \u0935\u093E\u092A\u0938',
    gsLeave: '\u091B\u094B\u0921\u093C\u0947\u0902',
    gsDemoSim: '\u0921\u0947\u092E\u094B \u0938\u0947\u0936\u0928 \u2014 \u092C\u093E\u0915\u0940 \u0916\u093F\u0932\u093E\u0921\u093C\u0940 \u0907\u0938 \u0921\u093F\u0935\u093E\u0907\u0938 \u092A\u0930 \u0938\u093F\u092E\u094D\u092F\u0941\u0932\u0947\u091F \u0915\u093F\u090F \u0917\u090F \u0939\u0948\u0902',
    gsGameOver: '\u0917\u0947\u092E \u0916\u093C\u0924\u094D\u092E',
    gsStartFailed: '\u0917\u0947\u092E \u0938\u0947\u0936\u0928 \u0936\u0941\u0930\u0942 \u0928\u0939\u0940\u0902 \u0939\u094B \u0938\u0915\u093E',
    compTitle: '\u0939\u092B\u093C\u094D\u0924\u0947 \u0915\u0940 \u092A\u094D\u0930\u0924\u093F\u092F\u094B\u0917\u093F\u0924\u093E',
    compThisWeek: '\u0907\u0938 \u0939\u092B\u093C\u094D\u0924\u0947 \u0915\u093E \u092A\u094D\u0930\u0949\u092E\u094D\u092A\u094D\u091F',
    compPromptWord: '\u092A\u094D\u0930\u0949\u092E\u094D\u092A\u094D\u091F',
    compPrize: '\u0907\u0928\u093E\u092E: \u2726 {n} \u0915\u094D\u0930\u0947\u0921\u093F\u091F',
    compEntries: '{n} \u090F\u0902\u091F\u094D\u0930\u0940',
    compEntriesOne: '1 \u090F\u0902\u091F\u094D\u0930\u0940',
    compEndsIn: '{t} \u092E\u0947\u0902 \u0916\u093C\u0924\u094D\u092E \u0939\u094B\u0917\u093E',
    compYourEntry: '\u0906\u092A\u0915\u0940 \u090F\u0902\u091F\u094D\u0930\u0940 \u0932\u0917 \u0917\u0908 \u2014 \u0917\u0941\u0921 \u0932\u0915!',
    compEnter: '\u092F\u0939 \u0935\u0940\u0921\u093F\u092F\u094B \u090F\u0902\u091F\u0930 \u0915\u0930\u0947\u0902',
    compPickYours: '\u0905\u092A\u0928\u093E \u090F\u0915 AI \u0935\u0940\u0921\u093F\u092F\u094B \u090F\u0902\u091F\u0930 \u0915\u0930\u0947\u0902:',
    compNoAiVideos: '\u0905\u092D\u0940 \u0906\u092A\u0915\u0947 \u0915\u094B\u0908 AI \u0935\u0940\u0921\u093F\u092F\u094B \u0928\u0939\u0940\u0902 \u0939\u0948\u0902 \u2014 \u090F\u0902\u091F\u0930 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0907\u0938 \u0939\u092B\u093C\u094D\u0924\u0947 \u0915\u093E \u092A\u094D\u0930\u0949\u092E\u094D\u092A\u094D\u091F \u091C\u0928\u0930\u0947\u091F \u0915\u0930\u0947\u0902\u0964',
    compGenerateCta: '\u092A\u094D\u0930\u0949\u092E\u094D\u092A\u094D\u091F \u091C\u0928\u0930\u0947\u091F \u0915\u0930\u0947\u0902',
    compDormant: '{min} \u0915\u094D\u0930\u093F\u090F\u091F\u0930\u094D\u0938 \u092A\u0930 \u0916\u0941\u0932\u0947\u0917\u093E \u2014 \u0905\u092D\u0940 {n} \u0939\u0948\u0902',
    compProgress: '{n} / {min} \u0915\u094D\u0930\u093F\u090F\u091F\u0930\u094D\u0938',
    compWinner: '\u0935\u093F\u091C\u0947\u0924\u093E',
    compWonWith: '{n} \u0932\u093E\u0907\u0915\u094D\u0938 \u0915\u0947 \u0938\u093E\u0925 \u091C\u0940\u0924\u093E',
    compPastWinners: '\u092A\u093F\u091B\u0932\u0947 \u0935\u093F\u091C\u0947\u0924\u093E',
    compNoWinnersYet: '\u0905\u092D\u0940 \u0915\u094B\u0908 \u0935\u093F\u091C\u0947\u0924\u093E \u0928\u0939\u0940\u0902 \u2014 \u092A\u0939\u0932\u093E \u0924\u093E\u091C \u0905\u092D\u0940 \u092D\u0940 \u0916\u093E\u0932\u0940 \u0939\u0948\u0964',
    compEnteredToast: '\u0906\u092A \u0905\u0902\u0926\u0930 \u0939\u0948\u0902! \u0907\u0938 \u0939\u092B\u093C\u094D\u0924\u0947 \u0915\u0947 \u0932\u093F\u090F \u0906\u092A\u0915\u0940 \u090F\u0902\u091F\u094D\u0930\u0940 \u0932\u0949\u0915 \u0939\u094B \u0917\u0908\u0964',
    compDemoNote: '\u0921\u0947\u092E\u094B \u092A\u094D\u0930\u0940\u0935\u094D\u092F\u0942 \u2014 \u090F\u0902\u091F\u0930 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0905\u0938\u0932\u0940 \u0905\u0915\u093E\u0909\u0902\u091F \u091A\u093E\u0939\u093F\u090F, \u0914\u0930 \u092A\u094D\u0930\u0924\u093F\u092F\u094B\u0917\u093F\u0924\u093E\u090F\u0902 500 \u0915\u094D\u0930\u093F\u090F\u091F\u0930\u094D\u0938 \u092A\u0930 \u0916\u0941\u0932\u0924\u0940 \u0939\u0948\u0902\u0964',
    compLikesWord: '\u0932\u093E\u0907\u0915\u094D\u0938',
    err_COMPETITIONS_NOT_ACTIVE: '\u092A\u094D\u0930\u0924\u093F\u092F\u094B\u0917\u093F\u0924\u093E\u090F\u0902 \u0905\u092D\u0940 \u0916\u0941\u0932\u0940 \u0928\u0939\u0940\u0902 \u0939\u0948\u0902\u0964',
    err_COMPETITION_CLOSED: '\u0907\u0938 \u0939\u092B\u093C\u094D\u0924\u0947 \u0915\u0940 \u092A\u094D\u0930\u0924\u093F\u092F\u094B\u0917\u093F\u0924\u093E \u0916\u093C\u0924\u094D\u092E \u0939\u094B \u0917\u0908 \u0939\u0948\u0964',
    err_NOT_AI_VIDEO: '\u090F\u0902\u091F\u094D\u0930\u0940 \u0935\u0939\u0940 \u0935\u0940\u0921\u093F\u092F\u094B \u0939\u094B \u0938\u0915\u0924\u0947 \u0939\u0948\u0902 \u091C\u094B \u0906\u092A\u0928\u0947 AI \u0938\u0947 \u091C\u0928\u0930\u0947\u091F \u0915\u093F\u090F \u0939\u094B\u0902\u0964',
    err_NOT_YOUR_VIDEO: '\u0906\u092A \u0938\u093F\u0930\u094D\u092B\u093C \u0905\u092A\u0928\u0947 \u0935\u0940\u0921\u093F\u092F\u094B \u0939\u0940 \u090F\u0902\u091F\u0930 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964',
    err_ALREADY_ENTERED: '\u0906\u092A \u0907\u0938 \u0939\u092B\u093C\u094D\u0924\u0947 \u092A\u0939\u0932\u0947 \u0939\u0940 \u090F\u0902\u091F\u0930 \u0915\u0930 \u091A\u0941\u0915\u0947 \u0939\u0948\u0902\u0964',
    startGame: '\u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902',
    playAgain: '\u092B\u093F\u0930 \u0938\u0947 \u0916\u0947\u0932\u0947\u0902',
    yourLevel: '\u0906\u092A\u0915\u093E \u0932\u0947\u0935\u0932',
    nextUnlock: '\u0905\u0917\u0932\u093E \u0905\u0928\u0932\u0949\u0915',
    gamePenalty: '\u092A\u0947\u0928\u0932\u094D\u091F\u0940 \u0915\u093F\u0915\u094D\u0938',
    gamePenaltyBlurb: '\u0915\u0940\u092A\u0930 \u092C\u0949\u091F \u0915\u0947 \u0916\u093C\u093F\u0932\u093E\u092B\u093C \u092C\u0947\u0938\u094D\u091F-\u0911\u092B\u093C-5 \u0936\u0942\u091F\u0906\u0909\u091F\u0964',
    gameFood: 'FoodNinja',
    gameFoodBlurb: '\u0918\u0921\u093C\u0940 \u0915\u0947 \u0916\u093C\u093F\u0932\u093E\u092B\u093C \u0909\u0921\u093C\u0924\u093E \u0916\u093E\u0928\u093E \u0938\u094D\u0935\u093E\u0907\u092A-\u0915\u093E\u091F\u0947\u0902 \u2014 \u0938\u094B\u0932\u094B vs AI \u092F\u093E 1v1 \u0911\u0928\u0932\u093E\u0907\u0928\u0964',
    foodRules: '\u0909\u0921\u093C\u0924\u0947 \u0916\u093E\u0928\u0947 \u0915\u094B \u0915\u093E\u091F\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0909\u0938\u0915\u0947 \u090A\u092A\u0930 \u0938\u0947 \u0938\u094D\u0935\u093E\u0907\u092A \u0915\u0930\u0947\u0902\u0964 \u090F\u0915 \u0938\u094D\u0935\u093E\u0907\u092A \u092E\u0947\u0902 3+ = \u0915\u0949\u092E\u094D\u092C\u094B \u092A\u094D\u0932\u0948\u091F\u0930 \u092C\u094B\u0928\u0938\u0964 FEVER \u0921\u092C\u0932 \u092A\u0949\u0907\u0902\u091F\u094D\u0938 \u0915\u0947 \u0932\u093F\u090F \u092E\u0940\u091F\u0930 \u092D\u0930\u0947\u0902\u0964 \u0938\u0921\u093C\u0947 \u0939\u0941\u090F \u0905\u0902\u0921\u0947 \u0915\u094B \u0915\u092D\u0940 \u092E\u0924 \u0915\u093E\u091F\u0928\u093E!',
    pkPower: '\u092A\u093E\u0935\u0930',
    gamePong: '\u092A\u093F\u0902\u0917 \u092A\u0949\u0928\u094D\u0917',
    gamePongBlurb: '\u092C\u0949\u091F \u0915\u0947 \u0916\u093C\u093F\u0932\u093E\u092B\u093C 1v1 \u092A\u0948\u0921\u0932 \u092E\u0941\u0915\u093C\u093E\u092C\u0932\u093E\u0964 \u092A\u0939\u0932\u0947 7 \u0924\u0915\u0964',
    gameVolley: '\u0935\u0949\u0932\u0940 \u0921\u094D\u092F\u0942\u090F\u0932',
    gameVolleyBlurb: '1v1 \u091F\u093E\u0907\u092E\u094D\u0921 \u0938\u094D\u092A\u094B\u0930\u094D\u091F\u094D\u0938 \u0921\u094D\u092F\u0942\u090F\u0932 \u2014 \u0918\u0921\u093C\u0940 \u0916\u093C\u0924\u094D\u092E \u0939\u094B\u0928\u0947 \u092A\u0930 \u0938\u092C\u0938\u0947 \u091C\u093C\u094D\u092F\u093E\u0926\u093E \u092A\u0949\u0907\u0902\u091F\u094D\u0938 \u0935\u093E\u0932\u093E \u091C\u0940\u0924\u093E\u0964',
    gameVolfield: 'Volfield',
    gameVolfieldBlurb: 'घूमते बॉस के ख़िलाफ़ इलाक़ा कब्ज़ा — लाइन खींचें, 80% जीतें, करंट से बचें।',
    gamePoker: '\u092A\u094B\u0915\u0930',
    gamePokerBlurb: '\u0926\u094B\u0938\u094D\u0924\u094B\u0902 \u0914\u0930 \u092C\u0949\u091F\u094D\u0938 \u0915\u0947 \u0938\u093E\u0925 \u092B\u094D\u0930\u0947\u0902\u0921\u0932\u0940 \u0939\u094B\u0932\u094D\u0921\'\u090F\u092E \u091F\u0947\u092C\u0932\u0964',
    pokerFreeShort: '\u0938\u093F\u0930\u094D\u092B\u093C \u092B\u093C\u094D\u0930\u0940 \u0915\u0949\u0907\u0928\u094D\u0938 \u2014 \u0916\u0947\u0932\u0915\u0930 \u0915\u092E\u093E\u090F \u091C\u093E\u0924\u0947 \u0939\u0948\u0902, \u0915\u092D\u0940 \u0916\u0930\u0940\u0926\u0947 \u0928\u0939\u0940\u0902 \u091C\u093E\u0924\u0947, \u0915\u092D\u0940 \u0915\u0948\u0936 \u0906\u0909\u091F \u0928\u0939\u0940\u0902 \u0939\u094B\u0924\u0947\u0964',
    penaltyRules: '\u092C\u0947\u0938\u094D\u091F \u0911\u092B\u093C 5, \u092B\u093F\u0930 \u0938\u0921\u0928 \u0921\u0947\u0925\u0964 \u0936\u0942\u091F\u093F\u0902\u0917: \u0917\u094B\u0932 \u0915\u0947 \u092A\u093E\u0930 \u0938\u094D\u0935\u093E\u0907\u092A \u0915\u0930\u0947\u0902 \u2014 \u0906\u092A\u0915\u0940 \u092B\u093C\u094D\u0932\u093F\u0915 \u091C\u0939\u093E\u0902 \u092A\u0921\u093C\u0947\u0917\u0940, \u092C\u0949\u0932 \u0935\u0939\u0940\u0902 \u091C\u093E\u090F\u0917\u0940, \u0914\u0930 \u092B\u093C\u094D\u0930\u0947\u092E \u0915\u0947 \u092A\u093E\u0938 \u092B\u093C\u0941\u0932-\u092A\u093E\u0935\u0930 \u092B\u093C\u094D\u0932\u093F\u0915 \u092C\u093E\u0939\u0930 \u092D\u0940 \u091C\u093E \u0938\u0915\u0924\u0940 \u0939\u0948\u0964 \u0938\u0947\u0935\u093F\u0902\u0917: \u092C\u0949\u091F \u0915\u0947 \u0936\u0942\u091F \u0915\u0930\u0924\u0947 \u0939\u0940 \u0921\u093E\u0907\u0935 \u0915\u0947 \u0932\u093F\u090F \u0938\u094D\u0935\u093E\u0907\u092A \u0915\u0930\u0947\u0902 \u2014 \u0926\u0947\u0930 \u0938\u0947 \u0915\u093F\u090F \u0917\u090F \u0921\u093E\u0907\u0935 \u0915\u092E \u091C\u093C\u092E\u0940\u0928 \u0915\u0935\u0930 \u0915\u0930\u0924\u0947 \u0939\u0948\u0902\u0964',
    pongRules: '\u092A\u0939\u0932\u0947 7 \u0924\u0915\u0964 \u0905\u092A\u0928\u093E \u092A\u0948\u0921\u0932 (\u0928\u0940\u091A\u0947) \u0938\u094D\u0932\u093E\u0907\u0921 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0921\u094D\u0930\u0948\u0917 \u0915\u0930\u0947\u0902 \u092F\u093E \u092E\u093E\u0909\u0938 \u0939\u093F\u0932\u093E\u090F\u0902\u0964 \u0939\u0930 \u092C\u093E\u0930 \u091C\u092C \u0906\u092A \u0938\u094D\u0915\u094B\u0930 \u0915\u0930\u0924\u0947 \u0939\u0948\u0902, \u092C\u0949\u091F \u0924\u0947\u091C\u093C \u0939\u094B\u0924\u093E \u091C\u093E\u0924\u093E \u0939\u0948\u0964',
    volleyTitle: '\u0935\u0949\u0932\u0940 \u0921\u094D\u092F\u0942\u090F\u0932 \u2014 1v1, \u0918\u0921\u093C\u0940 \u092A\u0930',
    volleyRules: '60 \u0938\u0947\u0915\u0902\u0921 \u0915\u093E \u091F\u093E\u0907\u092E\u094D\u0921 \u0921\u094D\u092F\u0942\u090F\u0932\u0964 \u0928\u0947\u091F \u0915\u0947 \u090A\u092A\u0930 \u0938\u0930\u094D\u0935, \u092C\u0902\u092A \u0914\u0930 \u0938\u094D\u092A\u093E\u0907\u0915 \u0915\u0930\u0947\u0902 \u2014 \u0918\u0921\u093C\u0940 \u0936\u0942\u0928\u094D\u092F \u092A\u0930 \u092A\u0939\u0941\u0902\u091A\u0928\u0947 \u092A\u0930 \u0938\u092C\u0938\u0947 \u091C\u093C\u094D\u092F\u093E\u0926\u093E \u092A\u0949\u0907\u0902\u091F\u094D\u0938 \u0935\u093E\u0932\u093E \u091C\u0940\u0924\u093E\u0964 \u0935\u093E\u0930\u094D\u092E-\u0905\u092A \u0915\u0947 \u0932\u093F\u090F \u092C\u0949\u091F \u0915\u094B \u0939\u0930\u093E\u090F\u0902, \u092B\u093F\u0930 \u0905\u0938\u0932\u0940 \u0924\u093E\u091C \u0915\u0947 \u0932\u093F\u090F \u0926\u094B\u0938\u094D\u0924 \u0915\u094B \u091A\u0948\u0932\u0947\u0902\u091C \u0915\u0930\u0947\u0902\u0964',
    volleySoon: '\u092F\u0939 \u0905\u092D\u0940 \u092C\u0928 \u0930\u0939\u093E \u0939\u0948 \u2014 \u0915\u094B\u0930\u094D\u091F, \u0928\u0947\u091F \u092B\u093C\u093F\u091C\u093C\u093F\u0915\u094D\u0938 \u0914\u0930 \u091F\u093E\u0907\u092E\u094D\u0921 \u0930\u093E\u0909\u0902\u0921 \u092C\u093E\u0926 \u0915\u0947 \u0905\u092A\u0921\u0947\u091F \u092E\u0947\u0902 \u0906\u090F\u0902\u0917\u0947\u0964 \u0905\u092D\u0940 \u092A\u094B\u0938\u094D\u091F \u0915\u093F\u090F \u0917\u090F \u091A\u0948\u0932\u0947\u0902\u091C \u0921\u0947\u092E\u094B \u0915\u093E\u0930\u094D\u0921 \u0939\u0948\u0902\u0964',
    pokerTitle: '\u092A\u094B\u0915\u0930 \u2014 \u092B\u094D\u0930\u0947\u0902\u0921\u0932\u0940 \u091F\u0947\u092C\u0932',
    pokerRules: '\u092B\u094D\u0930\u0947\u0902\u0921\u0932\u0940 \u091F\u0947\u092C\u0932 \u092A\u0930 \u091F\u0947\u0915\u094D\u0938\u093E\u0938 \u0939\u094B\u0932\u094D\u0921\'\u090F\u092E \u2014 \u0906\u092A, \u0906\u092A\u0915\u0947 \u0926\u094B\u0938\u094D\u0924 \u0914\u0930 \u0915\u0941\u091B \u092C\u0949\u091F\u0964 \u0926\u094B \u0915\u093E\u0930\u094D\u0921 \u0928\u0940\u091A\u0947, \u092A\u093E\u0902\u091A \u092C\u094B\u0930\u094D\u0921 \u092A\u0930, \u0938\u092C\u0938\u0947 \u0905\u091A\u094D\u091B\u093E \u0939\u093E\u0925 \u0917\u0947\u092E \u0915\u0949\u0907\u0928\u094D\u0938 \u0915\u093E \u092A\u0949\u091F \u0932\u0947\u0924\u093E \u0939\u0948\u0964',
    pokerFreeRule: 'सिर्फ़ फ़्री कॉइन्स। यहां पोकर उन गेम कॉइन्स पर चलता है जो खेलकर कमाए जाते हैं — वे कभी बेचे नहीं जाते, कभी खरीदे नहीं जाते, और कभी क्रेडिट में बदले या कैश आउट नहीं किए जा सकते। यह एक गेम है, जुआ नहीं।',
    pokerSoon: '\u091F\u0947\u092C\u0932 \u0905\u092D\u0940 \u092C\u0928 \u0930\u0939\u0947 \u0939\u0948\u0902\u0964 \u0905\u092D\u0940 \u092A\u094B\u0938\u094D\u091F \u0915\u093F\u090F \u0917\u090F \u091A\u0948\u0932\u0947\u0902\u091C \u0921\u0947\u092E\u094B \u0915\u093E\u0930\u094D\u0921 \u0939\u0948\u0902\u0964',
    messagePlaceholder: '\u092E\u0948\u0938\u0947\u091C\u2026',
    commentPlaceholder: '\u0915\u092E\u0947\u0902\u091F \u091C\u094B\u0921\u093C\u0947\u0902\u2026',
    liveChatPlaceholder: '\u0915\u0941\u091B \u0915\u0939\u0947\u0902\u2026',
    modeDemo: '\u092E\u094B\u0921: \u0921\u0947\u092E\u094B (\u0921\u093F\u0935\u093E\u0907\u0938 \u092A\u0930 \u0938\u0948\u0902\u092A\u0932 \u0915\u0902\u091F\u0947\u0902\u091F)',
    modeLive: '\u092E\u094B\u0921: \u0915\u0928\u0947\u0915\u094D\u091F\u0947\u0921 \u0905\u0915\u093E\u0909\u0902\u091F',
    xpToNext: '\u0905\u0917\u0932\u0947 \u0932\u0947\u0935\u0932 \u0924\u0915 XP',
    maxLevel: '\u091F\u0949\u092A \u0932\u0947\u0935\u0932 \u092A\u0930 \u092A\u0939\u0941\u0902\u091A \u0917\u090F',
    reachBoost: '\u0930\u0940\u091A \u092C\u0942\u0938\u094D\u091F',
    level: '\u0932\u0947\u0935\u0932',
    streakDays: '\u0926\u093F\u0928 \u0915\u0940 \u0905\u092A\u0932\u094B\u0921 \u0938\u094D\u091F\u094D\u0930\u0940\u0915',
    nextBadge: '\u0905\u0917\u0932\u093E \u092C\u0948\u091C',
    earnTitle: 'XP \u0915\u092E\u093E\u0928\u0947 \u0915\u0947 \u0924\u0930\u0940\u0915\u0947',
    badgesTitle: '\u092C\u0948\u091C',
    streakRuleLabel: '\u0905\u092A\u0932\u094B\u0921 \u0938\u094D\u091F\u094D\u0930\u0940\u0915 \u092C\u094B\u0928\u0938',
    milestoneLabel: '\u0935\u0940\u0921\u093F\u092F\u094B \u092E\u093E\u0907\u0932\u0938\u094D\u091F\u094B\u0928',
    levelUpToast: '\u0932\u0947\u0935\u0932 \u0905\u092A!',
    badgeToast: '\u0928\u092F\u093E \u092C\u0948\u091C:',
    watchingDemo: '\u0938\u0948\u0902\u092A\u0932 \u0938\u094D\u091F\u094D\u0930\u0940\u092E \u0932\u0947\u0906\u0909\u091F \u2014 \u0932\u093E\u0907\u0935 \u0935\u0940\u0921\u093F\u092F\u094B \u0924\u092C \u0915\u0928\u0947\u0915\u094D\u091F \u0939\u094B\u0917\u093E \u091C\u092C \u0938\u0930\u094D\u0935\u0930 \u092A\u0930 LiveKit \u091C\u0941\u0921\u093C\u093E \u0939\u094B\u0917\u093E\u0964',
    liveReady: '\u0915\u0928\u0947\u0915\u094D\u091F \u0939\u094B\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0924\u0948\u092F\u093E\u0930', liveConnecting: 'कनेक्ट हो रहा है…', liveConnected: 'कनेक्ट हो गया', liveOnAir: 'लाइव है', liveReconnecting: 'फिर से कनेक्ट हो रहा है…', liveWaitingMsg: 'होस्ट के वीडियो शुरू करने की प्रतीक्षा हो रही है…', liveEndedMsg: 'यह स्ट्रीम समाप्त हो गई है।', liveLostMsg: 'कनेक्शन टूट गया — स्ट्रीम समाप्त हो सकती है।', liveDeniedMsg: 'कैमरा या माइक्रोफ़ोन की अनुमति नहीं मिली, इसलिए कुछ भी प्रसारित नहीं हो रहा है। अनुमति देकर फिर से जुड़ें।', liveUnavailableMsg: 'लाइव वीडियो यहाँ शुरू नहीं हो सका — अपना कनेक्शन जांचकर फिर प्रयास करें।', 
    interest_food: 'खाना',
    interest_music: 'म्यूज़िक',
    interest_comedy: 'कॉमेडी',
    interest_sports: 'स्पोर्ट्स',
    interest_travel: 'ट्रैवल',
    interest_animals: 'जानवर',
    interest_gaming: 'गेमिंग',
    interest_beauty: 'ब्यूटी',
    interest_tech: 'टेक',
    interest_dance: 'डांस',
    interest_fitness: 'फ़िटनेस',
    interest_film: 'फ़िल्म',
    interest_fashion: 'फ़ैशन',
    interest_diy: 'DIY',
    interest_nature: 'नेचर',
    interest_cars: 'कारें',
    share: '\u0936\u0947\u092F\u0930',
    remix: '\u0930\u0940\u092E\u093F\u0915\u094D\u0938',
    adSlot: '\u0910\u0921 \u0938\u094D\u0932\u0949\u091F',
    adText: '\u092F\u0939\u093E\u0902 \u0939\u0930 \u0925\u094B\u0921\u093C\u0940 \u0926\u0947\u0930 \u092E\u0947\u0902 \u090F\u0915 \u0910\u0921 \u0926\u093F\u0916\u0924\u093E \u0939\u0948 \u2014 \u092F\u0939\u0940 \u0935\u094B \u0921\u0940\u0932 \u0939\u0948 \u091C\u094B LOOPI \u0915\u094B \u0926\u0947\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u092B\u093C\u094D\u0930\u0940 \u0930\u0916\u0924\u0940 \u0939\u0948\u0964',
    demoTag: '\u0921\u0947\u092E\u094B',
    unknownUser: '\u0905\u0928\u091C\u093E\u0928',
    noComments: '\u0905\u092D\u0940 \u0915\u094B\u0908 \u0915\u092E\u0947\u0902\u091F \u0928\u0939\u0940\u0902 \u2014 \u092C\u093E\u0924\u091A\u0940\u0924 \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902\u0964',
    shareDefaultText: '\u092F\u0939 LOOPI \u092A\u0930 \u0926\u0947\u0916\u0947\u0902',
    linkCopied: '\u0932\u093F\u0902\u0915 \u0915\u0949\u092A\u0940 \u0939\u094B \u0917\u092F\u093E \u2014 \u0907\u0938\u0947 WhatsApp, Instagram, SMS \u092E\u0947\u0902 \u092A\u0947\u0938\u094D\u091F \u0915\u0930\u0947\u0902\u2026',
    nothingMatches: '\u0915\u0941\u091B \u092E\u0948\u091A \u0928\u0939\u0940\u0902 \u0939\u0941\u0906 \u2014 \u0915\u094B\u0908 \u0914\u0930 \u0936\u092C\u094D\u0926 \u0906\u091C\u093C\u092E\u093E\u090F\u0902\u0964',
    uploadTooLong: '\u0935\u094B \u0935\u0940\u0921\u093F\u092F\u094B {s}s \u0915\u093E \u0939\u0948 \u2014 LOOPI \u0905\u092A\u0932\u094B\u0921 20 \u0938\u0947\u0915\u0902\u0921 \u0924\u0915 \u0938\u0940\u092E\u093F\u0924 \u0930\u0916\u0924\u093E \u0939\u0948\u0964 \u0907\u0938\u0947 \u091F\u094D\u0930\u093F\u092E \u0915\u0930\u0915\u0947 \u092B\u093F\u0930 \u0915\u094B\u0936\u093F\u0936 \u0915\u0930\u0947\u0902\u0964',
    uploadLooksGood: '\u092C\u0922\u093C\u093F\u092F\u093E \u0932\u0917 \u0930\u0939\u093E \u0939\u0948 ({s}s)\u0964',
    uploadCaptionPh: '\u0915\u0948\u092A\u094D\u0936\u0928 \u091C\u094B\u0921\u093C\u0947\u0902\u2026',
    uploadPostBtn: 'LOOPI \u092A\u0930 \u092A\u094B\u0938\u094D\u091F \u0915\u0930\u0947\u0902',
    uploadReadyPost: '\u0924\u0948\u092F\u093E\u0930 \u0939\u0948 \u2014 \u0938\u092C\u0915\u0947 \u0932\u093F\u090F \u0932\u093E\u0907\u0935 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u092A\u094B\u0938\u094D\u091F \u0915\u0930\u0947\u0902\u0964',
    uploadLocalOnly: '\u092A\u094D\u0930\u0940\u0935\u094D\u092F\u0942 \u0938\u093F\u0930\u094D\u092B\u093C \u0907\u0938 \u0921\u093F\u0935\u093E\u0907\u0938 \u092A\u0930 \u0939\u0948\u0964 \u0938\u092C\u0915\u0947 \u0932\u093F\u090F \u092A\u094B\u0938\u094D\u091F \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0938\u093E\u0907\u0928 \u0907\u0928 \u0915\u0930\u0947\u0902\u0964',
    uploadingPct: '\u0905\u092A\u0932\u094B\u0921 \u0939\u094B \u0930\u0939\u093E \u0939\u0948\u2026 {p}%',
    uploadPosted: '\u092A\u094B\u0938\u094D\u091F \u0939\u094B \u0917\u092F\u093E \u2014 \u0906\u092A\u0915\u093E \u0935\u0940\u0921\u093F\u092F\u094B LOOPI \u092A\u0930 \u0932\u093E\u0907\u0935 \u0939\u0948\u0964',
    addSong: '\u0917\u093E\u0928\u093E \u091C\u094B\u0921\u093C\u0947\u0902',
    addSongNone: '\u0915\u094B\u0908 \u0917\u093E\u0928\u093E \u0928\u0939\u0940\u0902',
    addSongNote: '\u092E\u0941\u092B\u093C\u094D\u0924 \u0909\u092A\u092F\u094B\u0917 \u2014 \u0917\u093E\u0928\u093E \u0906\u092A\u0915\u0947 \u0935\u0940\u0921\u093F\u092F\u094B \u0915\u0940 \u0905\u0938\u0932\u0940 \u0906\u0935\u093E\u091C\u093C \u0915\u0940 \u091C\u0917\u0939 \u0932\u0947\u0917\u093E\u0964',
    musicUnavailable: '\u0917\u093E\u0928\u0947 \u0905\u092D\u0940 \u0909\u092A\u0932\u092C\u094D\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948\u0902\u0964',
    previewSong: '\u092A\u0942\u0930\u094D\u0935\u093E\u0935\u0932\u094B\u0915\u0928 \u091A\u0932\u093E\u090F\u0902',
    stopSong: '\u092A\u0942\u0930\u094D\u0935\u093E\u0935\u0932\u094B\u0915\u0928 \u0930\u094B\u0915\u0947\u0902',
    titleVoiceMessage: '\u0935\u0949\u0907\u0938 \u0938\u0902\u0926\u0947\u0936',
    voiceRecording: '\u0930\u093F\u0915\u0949\u0930\u094D\u0921 \u0939\u094B \u0930\u0939\u093E \u0939\u0948\u2026',
    voiceSending: '\u0935\u0949\u0907\u0938 \u0938\u0902\u0926\u0947\u0936 \u092D\u0947\u091C\u093E \u091C\u093E \u0930\u0939\u093E \u0939\u0948\u2026',
    transcribing: '\u091F\u094D\u0930\u093E\u0902\u0938\u0915\u094D\u0930\u093E\u0907\u092C \u0939\u094B \u0930\u0939\u093E \u0939\u0948\u2026',
    newPostsPill: '{count} \u0928\u0908 \u092a\u094b\u0938\u094d\u091f',
    voiceMicDenied: '\u092E\u093E\u0907\u0915\u094D\u0930\u094B\u092B\u093C\u094B\u0928 \u0915\u0940 \u0905\u0928\u0941\u092E\u0924\u093F \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u0940 \u2014 \u0935\u0949\u0907\u0938 \u0938\u0902\u0926\u0947\u0936 \u092D\u0947\u091C\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0905\u0928\u0941\u092E\u0924\u093F \u0926\u0947\u0902\u0964',
    voiceUnsupported: '\u0907\u0938 \u0921\u093F\u0935\u093E\u0907\u0938 \u092A\u0930 \u0935\u0949\u0907\u0938 \u0930\u093F\u0915\u0949\u0930\u094D\u0921\u093F\u0902\u0917 \u0938\u092E\u0930\u094D\u0925\u093F\u0924 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964',
    voiceNeedsAccount: '\u0935\u0949\u0907\u0938 \u0938\u0902\u0926\u0947\u0936 \u0915\u0947 \u0932\u093F\u090F \u0938\u093E\u0907\u0928-\u0907\u0928 \u0915\u093F\u092F\u093E \u0939\u0941\u0906 \u0916\u093E\u0924\u093E \u091A\u093E\u0939\u093F\u090F\u0964',
    voiceSendFailed: '\u0935\u0949\u0907\u0938 \u0938\u0902\u0926\u0947\u0936 \u0928\u0939\u0940\u0902 \u092D\u0947\u091C\u093E \u091C\u093E \u0938\u0915\u093E\u0964 \u092B\u093F\u0930 \u0938\u0947 \u0915\u094B\u0936\u093F\u0936 \u0915\u0930\u0947\u0902\u0964',
    mood_upbeat: '\u0905\u092A\u092C\u0940\u091F \u092A\u0949\u092A',
    mood_chill: '\u0936\u093E\u0902\u0924',
    mood_rock: '\u0930\u0949\u0915',
    mood_edm: '\u0908\u0921\u0940\u090F\u092E',
    mood_acoustic: '\u0916\u0941\u0936 \u0927\u0941\u0928',
    mood_dramatic: '\u0928\u093E\u091F\u0915\u0940\u092F',
    uploadMixingToast: '\u092A\u094B\u0938\u094D\u091F \u0939\u094B \u0917\u092F\u093E \u2014 \u0906\u092A\u0915\u093E \u0917\u093E\u0928\u093E \u091C\u094B\u0921\u093C\u093E \u091C\u093E \u0930\u0939\u093E \u0939\u0948, \u0915\u0941\u091B \u0938\u0947\u0915\u0902\u0921 \u092E\u0947\u0902 \u092B\u093C\u0940\u0921 \u092E\u0947\u0902 \u0926\u093F\u0916\u0947\u0917\u093E\u0964',
    uploadFailed: '\u0905\u092A\u0932\u094B\u0921 \u0935\u093F\u092B\u0932\u0964 \u0905\u092A\u0928\u093E \u0915\u0928\u0947\u0915\u094D\u0936\u0928 \u091C\u093E\u0902\u091A\u0915\u0930 \u092B\u093F\u0930 \u0915\u094B\u0936\u093F\u0936 \u0915\u0930\u0947\u0902\u0964',
    uploadTooBig: '\u092B\u093C\u093E\u0907\u0932 \u092C\u0939\u0941\u0924 \u092C\u0921\u093C\u0940 \u0939\u0948 \u2014 LOOPI 100 MB \u0924\u0915 \u0938\u094D\u0935\u0940\u0915\u093E\u0930 \u0915\u0930\u0924\u093E \u0939\u0948\u0964',
    uploadCheckingToast: '\u0905\u092A\u0932\u094B\u0921 \u0939\u094B \u0917\u092F\u093E \u2014 \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u091C\u093E\u0901\u091A \u091A\u0932 \u0930\u0939\u0940 \u0939\u0948\u0964 \u092A\u093E\u0938 \u0939\u094B\u0924\u0947 \u0939\u0940 \u092B\u093C\u0940\u0921 \u092E\u0947\u0902 \u0926\u093F\u0916\u0947\u0917\u093E\u0964',
    modChecking: '\u091C\u093E\u0901\u091A \u0939\u094B \u0930\u0939\u0940 \u0939\u0948\u2026',
    modRejected: '\u0905\u0938\u094D\u0935\u0940\u0915\u0943\u0924',
    uploadNotVideo: '\u0909\u0938 \u092B\u093C\u093E\u0907\u0932 \u0915\u094B \u0935\u0940\u0921\u093F\u092F\u094B \u0915\u0947 \u0930\u0942\u092A \u092E\u0947\u0902 \u092A\u0922\u093C\u093E \u0928\u0939\u0940\u0902 \u091C\u093E \u0938\u0915\u093E\u0964',
    genDescribeFirst: '\u092A\u0939\u0932\u0947 \u0935\u0940\u0921\u093F\u092F\u094B \u0915\u093E \u0935\u0930\u094D\u0923\u0928 \u0915\u0930\u0947\u0902 (\u0915\u092E \u0938\u0947 \u0915\u092E \u0915\u0941\u091B \u0905\u0915\u094D\u0937\u0930)\u0964',
    genNeedsAccount: '\u091C\u0947\u0928\u0930\u0947\u0936\u0928 \u092E\u0947\u0902 \u0905\u0938\u0932\u0940 \u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0916\u093C\u0930\u094D\u091A \u0939\u094B\u0924\u0947 \u0939\u0948\u0902, \u0907\u0938\u0932\u093F\u090F \u0907\u0938\u0915\u0947 \u0932\u093F\u090F \u0905\u0938\u0932\u0940 \u0905\u0915\u093E\u0909\u0902\u091F \u091A\u093E\u0939\u093F\u090F \u2014 \u0906\u092A \u0921\u0947\u092E\u094B \u092C\u094D\u0930\u093E\u0909\u091C\u093C \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902\u0964 \u091C\u0928\u0930\u0947\u091F \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0938\u093E\u0907\u0928 \u0905\u092A \u0915\u0930\u0947\u0902\u0964',
    genNotEnough: '\u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0915\u092E \u0939\u0948\u0902 \u2014 \u0907\u0938 \u091C\u0947\u0928\u0930\u0947\u0936\u0928 \u0915\u0947 \u0932\u093F\u090F {n} \u091A\u093E\u0939\u093F\u090F\u0964 \u0905\u092A\u0928\u0940 \u092A\u094D\u0930\u094B\u092B\u093C\u093E\u0907\u0932 \u0938\u0947 \u090F\u0915 \u092A\u0948\u0915 \u0932\u0947\u0902\u0964',
    genNotEnoughFull: '\u0909\u0938 \u091C\u0947\u0928\u0930\u0947\u0936\u0928 \u0915\u0947 \u0932\u093F\u090F \u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0915\u092E \u0939\u0948\u0902\u0964 \u0905\u092A\u0928\u0940 \u092A\u094D\u0930\u094B\u092B\u093C\u093E\u0907\u0932 \u0938\u0947 \u090F\u0915 \u092A\u0948\u0915 \u0932\u0947\u0902\u0964',
    genDone: '\u0939\u094B \u0917\u092F\u093E \u2014 \u0906\u092A\u0915\u0940 \u091C\u0947\u0928\u0930\u0947\u0936\u0928 \u092B\u093C\u0940\u0921 \u092E\u0947\u0902 \u0939\u0948\u0964',
    genResultCaption: '\u2014 {n} \u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0915\u091F\u0947\u0964 \u0905\u092C \u092F\u0939 \u092B\u093C\u0940\u0921 \u092E\u0947\u0902 \u0932\u093E\u0907\u0935 \u0939\u0948\u0964',
    serverUnreachable: '\u0938\u0930\u094D\u0935\u0930 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0928\u0939\u0940\u0902 \u0939\u094B \u0930\u0939\u093E',
    serverUnreachableAuth: '\u0938\u0930\u094D\u0935\u0930 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0928\u0939\u0940\u0902 \u0939\u094B \u0930\u0939\u093E \u2014 \u091C\u093E\u0902\u091A\u0947\u0902 \u0915\u093F API \u091A\u0932 \u0930\u0939\u093E \u0939\u0948, \u092F\u093E \u0921\u0947\u092E\u094B \u092C\u094D\u0930\u093E\u0909\u091C\u093C \u0915\u0930\u0947\u0902\u0964',
    genServerUnreachable: '\u0938\u0930\u094D\u0935\u0930 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0928\u0939\u0940\u0902 \u0939\u094B \u0930\u0939\u093E \u2014 \u091C\u0947\u0928\u0930\u0947\u0936\u0928 \u0915\u0947 \u0932\u093F\u090F API \u091A\u0932\u0928\u093E \u091C\u093C\u0930\u0942\u0930\u0940 \u0939\u0948\u0964',
    emailPasswordRequired: '\u0908\u092E\u0947\u0932 \u0914\u0930 \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u091C\u093C\u0930\u0942\u0930\u0940 \u0939\u0948\u0902\u0964',
    onboardSaveFailed: '\u0938\u0947\u0935 \u0928\u0939\u0940\u0902 \u0939\u094B \u0938\u0915\u093E \u2014 \u0906\u092A \u092C\u093E\u0926 \u092E\u0947\u0902 \u0905\u092A\u0928\u0940 \u092A\u094D\u0930\u094B\u092B\u093C\u093E\u0907\u0932 \u092E\u0947\u0902 \u0930\u0941\u091A\u093F\u092F\u093E\u0902 \u092C\u0926\u0932 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964',
    directMessage: '\u0921\u093E\u092F\u0930\u0947\u0915\u094D\u091F \u092E\u0948\u0938\u0947\u091C',
    roomKind_dm: 'dm',
    roomKind_group: 'group',
    roomKind_open: 'open',
    roomKind_private: 'private',
    roomPasswordTag: '\u092A\u093E\u0938\u0935\u0930\u094D\u0921',
    noChatsYet: '\u0905\u092D\u0940 \u0915\u094B\u0908 \u091A\u0948\u091F \u0928\u0939\u0940\u0902 \u2014 \u0928\u0940\u091A\u0947 \u090F\u0915 \u0930\u0942\u092E \u092C\u0928\u093E\u090F\u0902, \u092F\u093E \u0915\u093F\u0938\u0940 \u0926\u094B\u0938\u094D\u0924 \u0915\u094B \u0935\u0940\u0921\u093F\u092F\u094B \u0936\u0947\u092F\u0930 \u0915\u0930\u0947\u0902\u0964',
    roomPrivatePrompt: '\u092F\u0939 \u0930\u0942\u092E \u092A\u094D\u0930\u093E\u0907\u0935\u0947\u091F \u0939\u0948 \u2014 \u0907\u0938\u0915\u093E \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u0921\u093E\u0932\u0947\u0902:',
    sharedVideo: '\u090F\u0915 \u0935\u0940\u0921\u093F\u092F\u094B \u0936\u0947\u092F\u0930 \u0915\u093F\u092F\u093E',
    videoWord: '\u0935\u0940\u0921\u093F\u092F\u094B',
    roomNameRequired: '\u0930\u0942\u092E \u0915\u094B \u090F\u0915 \u0928\u093E\u092E \u0926\u0947\u0902\u0964',
    roomPasswordShort: '\u092A\u094D\u0930\u093E\u0907\u0935\u0947\u091F \u0930\u0942\u092E \u0915\u0947 \u0932\u093F\u090F \u0915\u092E \u0938\u0947 \u0915\u092E 4 \u0905\u0915\u094D\u0937\u0930\u094B\u0902 \u0915\u093E \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u091A\u093E\u0939\u093F\u090F\u0964',
    roomDemoCreated: '\u0921\u0947\u092E\u094B \u0930\u0942\u092E \u092C\u0928 \u0917\u092F\u093E (\u0907\u0938 \u0921\u093F\u0935\u093E\u0907\u0938 \u092A\u0930)\u0964',
    roomCreated: '\u0930\u0942\u092E \u092C\u0928 \u0917\u092F\u093E\u0964',
    nobodyLive: '\u0905\u092D\u0940 \u0915\u094B\u0908 \u0932\u093E\u0907\u0935 \u0928\u0939\u0940\u0902 \u0939\u0948 \u2014 \u092A\u0939\u0932\u0947 \u0906\u092A \u092C\u0928\u0947\u0902\u0964',
    liveWord: '\u0932\u093E\u0907\u0935',
    liveBadge: '\u25CF LIVE',
    isLiveSuffix: ' \u0932\u093E\u0907\u0935 \u0939\u0948',
    theStreamer: '\u0938\u094D\u091F\u094D\u0930\u0940\u092E\u0930',
    tipDemo: '\u0921\u0947\u092E\u094B \u0938\u094D\u091F\u094D\u0930\u0940\u092E \u2014 \u091F\u093F\u092A\u094D\u0938 \u0915\u0947 \u0932\u093F\u090F \u0905\u0938\u0932\u0940 \u0938\u094D\u091F\u094D\u0930\u0940\u092E \u0914\u0930 \u0938\u093E\u0907\u0928-\u0907\u0928 \u0915\u093F\u092F\u093E \u0939\u0941\u0906 \u0905\u0915\u093E\u0909\u0902\u091F \u091A\u093E\u0939\u093F\u090F\u0964 \u0915\u0941\u091B \u092D\u0940 \u091A\u093E\u0930\u094D\u091C \u0928\u0939\u0940\u0902 \u0939\u0941\u0906\u0964',
    tippedMsg: '\u0906\u092A\u0928\u0947 {who} \u0915\u094B \u2726 {amount} \u091F\u093F\u092A \u0926\u093F\u092F\u093E \u2014 \u0909\u0928\u0915\u093E \u0938\u093E\u0925 \u0926\u0947\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0927\u0928\u094D\u092F\u0935\u093E\u0926\u0964',
    giftBtn: 'गिफ़्ट', giftShelfTitle: '\u0917\u093F\u092B\u093C\u094D\u091F \u092D\u0947\u091C\u0947\u0902',
    giftBalance: '\u0906\u092A\u0915\u093E \u092C\u0948\u0932\u0947\u0902\u0938',
    giftSentMsg: '\u0906\u092A\u0928\u0947 {who} \u0915\u094B {gift} \u092D\u0947\u091C\u093E \u2014 \u0909\u0928\u0915\u093E \u0938\u093E\u0925 \u0926\u0947\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0927\u0928\u094D\u092F\u0935\u093E\u0926\u0964',
    giftEventLine: '\u0928\u0947 {gift} \u092D\u0947\u091C\u093E',
    giftDemo: '\u0921\u0947\u092E\u094B \u0938\u091F\u094D\u0930\u0940\u092E \u2014 \u0917\u093F\u092B\u093C\u094D\u091F \u0915\u0947 \u0932\u093F\u090F \u0905\u0938\u0932\u0940 \u0938\u091F\u094D\u0930\u0940\u092E \u0914\u0930 \u0938\u093E\u0907\u0928-\u0907\u0928 \u0915\u093F\u092F\u093E \u0939\u0941\u0906 \u0905\u0915\u093E\u0909\u0902\u091F \u091A\u093E\u0939\u093F\u090F\u0964 \u0915\u0941\u091B \u092D\u0940 \u091A\u093E\u0930\u094D\u091C \u0928\u0939\u0940\u0902 \u0939\u0941\u0906\u0964',
    giftName_rose: '\u0917\u0941\u0932\u093E\u092C', giftName_heart: '\u0926\u093F\u0932', giftName_star: '\u0924\u093E\u0930\u093E', giftName_crown: '\u092E\u0941\u0915\u0941\u091F',
    giftName_rocket: '\u0930\u0949\u0915\u0947\u091F', giftName_diamond: '\u0939\u0940\u0930\u093E', giftName_castle: '\u0915\u093F\u0932\u093E', giftName_dragon: '\u0921\u094D\u0930\u0948\u0917\u0928',
    goLiveNeedsAccount: '\u0932\u093E\u0907\u0935 \u091C\u093E\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0905\u0938\u0932\u0940 \u0905\u0915\u093E\u0909\u0902\u091F \u091A\u093E\u0939\u093F\u090F \u2014 \u0906\u092A \u0921\u0947\u092E\u094B \u092C\u094D\u0930\u093E\u0909\u091C\u093C \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902\u0964',
    youAreLive: '\u0906\u092A \u0932\u093E\u0907\u0935 \u0939\u0948\u0902 \u2014 \u0915\u0928\u0947\u0915\u094D\u091F \u0939\u094B\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0924\u0948\u092F\u093E\u0930\u0964',
    liveNotConfiguredMsg: '\u0906\u092A\u0915\u093E \u0932\u093E\u0907\u0935 \u0930\u0942\u092E \u092C\u0928 \u0917\u092F\u093E, \u0932\u0947\u0915\u093F\u0928 \u0938\u0930\u094D\u0935\u0930 \u092A\u0930 \u0932\u093E\u0907\u0935 \u0938\u094D\u091F\u094D\u0930\u0940\u092E\u093F\u0902\u0917 \u0905\u092D\u0940 \u091A\u093E\u0932\u0942 \u0928\u0939\u0940\u0902 \u0939\u0948, \u0907\u0938\u0932\u093F\u090F \u091C\u0949\u0907\u0928 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0915\u094B\u0908 \u092C\u094D\u0930\u0949\u0921\u0915\u093E\u0938\u094D\u091F \u0928\u0939\u0940\u0902 \u0939\u0948\u0964 \u0930\u0942\u092E \u092E\u094C\u091C\u0942\u0926 \u0939\u0948; \u0938\u0930\u094D\u0935\u0930 \u0915\u0949\u0928\u094D\u092B\u093C\u093F\u0917\u0930 \u0939\u094B\u0924\u0947 \u0939\u0940 \u0935\u0940\u0921\u093F\u092F\u094B \u0936\u0941\u0930\u0942 \u0939\u094B\u0917\u093E\u0964',
    perCreditPrice: '$2.00 / \u0915\u094D\u0930\u0947\u0921\u093F\u091F',
    buy: '\u0916\u0930\u0940\u0926\u0947\u0902',
    checkoutDemo: '\u0921\u0947\u092E\u094B \u092E\u094B\u0921: \u092F\u0939\u093E\u0902 \u091A\u0947\u0915\u0906\u0909\u091F \u0905\u0938\u0932\u0940 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964 \u0932\u093E\u0907\u0935 \u0910\u092A \u092E\u0947\u0902 \u092F\u0939 \u092A\u0948\u0915 Play Billing \u0938\u0947 \u0916\u0930\u0940\u0926\u093E \u091C\u093E\u0924\u093E \u0939\u0948\u0964',
    packStubMsg: '\u2726 {n} \u091C\u0941\u0921\u093C \u0917\u090F \u2014 \u0938\u091A \u0915\u0939\u0947\u0902 \u0924\u094B: \u0938\u0930\u094D\u0935\u0930 \u0928\u0947 \u092F\u0947 \u0905\u092A\u0928\u0947 \u092C\u093F\u0932\u093F\u0902\u0917 STUB \u0938\u0947 \u0926\u093F\u090F \u0939\u0948\u0902\u0964 Play Billing \u0935\u0947\u0930\u093F\u092B\u093C\u093F\u0915\u0947\u0936\u0928 \u0905\u092D\u0940 \u091C\u0941\u0921\u093C\u093E \u0928\u0939\u0940\u0902 \u0939\u0948, \u0907\u0938\u0932\u093F\u090F \u0915\u094B\u0908 \u0905\u0938\u0932\u0940 \u092A\u0947\u092E\u0947\u0902\u091F \u0928\u0939\u0940\u0902 \u0932\u093F\u092F\u093E \u092F\u093E \u091C\u093E\u0902\u091A\u093E \u0917\u092F\u093E\u0964',
    packAddedMsg: '\u2726 {n} \u0915\u094D\u0930\u0947\u0921\u093F\u091F \u091C\u0941\u0921\u093C \u0917\u090F\u0964',
    tagUploader: '\u0905\u092A\u0932\u094B\u0921\u0930',
    tagExplorer: '\u090F\u0915\u094D\u0938\u092A\u094D\u0932\u094B\u0930\u0930',
    earlyMember: 'शुरुआती मेंबर',
    interestsWord: '\u0930\u0941\u091A\u093F\u092F\u093E\u0902',
    youDemoName: '\u0906\u092A (\u0921\u0947\u092E\u094B)',
    lvlName_starter: '\u0938\u094D\u091F\u093E\u0930\u094D\u091F\u0930',
    lvlName_rising: '\u0930\u093E\u0907\u091C\u093C\u093F\u0902\u0917',
    lvlName_creator: '\u0915\u094D\u0930\u093F\u090F\u091F\u0930',
    lvlName_procreator: '\u092A\u094D\u0930\u094B \u0915\u094D\u0930\u093F\u090F\u091F\u0930',
    lvlName_starcreator: '\u0938\u094D\u091F\u093E\u0930 \u0915\u094D\u0930\u093F\u090F\u091F\u0930',
    earnUpload: '\u090F\u0915 \u0935\u0940\u0921\u093F\u092F\u094B \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u0947\u0902',
    earnGenerate: 'AI \u0938\u0947 \u090F\u0915 \u0935\u0940\u0921\u093F\u092F\u094B \u091C\u0928\u0930\u0947\u091F \u0915\u0930\u0947\u0902',
    earnFirstUpload: '\u0906\u092A\u0915\u0947 \u0938\u092C\u0938\u0947 \u092A\u0939\u0932\u0947 \u0905\u092A\u0932\u094B\u0921 \u0915\u0947 \u0932\u093F\u090F \u090F\u0915 \u092C\u093E\u0930 \u0915\u093E \u092C\u094B\u0928\u0938',
    badge_first_upload: '\u092A\u0939\u0932\u093E \u0905\u092A\u0932\u094B\u0921',
    badge_streak_7: '7-\u0926\u093F\u0928 \u0915\u0940 \u0938\u094D\u091F\u094D\u0930\u0940\u0915',
    badge_likes_100: '100 \u0932\u093E\u0907\u0915\u094D\u0938',
    badge_level_2: '\u0930\u093E\u0907\u091C\u093C\u093F\u0902\u0917',
    badge_level_3: '\u0915\u094D\u0930\u093F\u090F\u091F\u0930',
    badge_level_4: '\u092A\u094D\u0930\u094B \u0915\u094D\u0930\u093F\u090F\u091F\u0930',
    badge_level_5: '\u0938\u094D\u091F\u093E\u0930 \u0915\u094D\u0930\u093F\u090F\u091F\u0930',
    metric_likes: '\u0932\u093E\u0907\u0915\u094D\u0938',
    metric_comments: '\u0915\u092E\u0947\u0902\u091F',
    youWord: '\u0906\u092A',
    botWord: '\u092C\u0949\u091F',
    beatThat: '\u0907\u0938\u0947 \u0939\u0930\u093E\u0915\u0930 \u0926\u093F\u0916\u093E\u0913!',
    coinsRewardSuffix: ' \u0917\u0947\u092E \u0915\u0949\u0907\u0928\u094D\u0938\u0964',
    pkResultWinText: 'आप जीते {a} — {b}! +{r} गेम कॉइन्स।',
    pkResultLoseText: 'बॉट जीता {a} — {b}। +{r} गेम कॉइन्स।',
    pongResultWinText: 'आप जीते {a} — {b} · +{r} गेम कॉइन्स।',
    pongResultLoseText: 'बॉट जीता {a} — {b} · +{r} गेम कॉइन्स।',
    pkYouFirst: '\u0906\u092A\u0915\u093E \u0936\u0949\u091F \u092A\u0939\u0932\u0947 \u2014 \u0917\u094B\u0932 \u0915\u0947 \u092A\u093E\u0930 \u0915\u093F\u0938\u0940 \u0915\u094B\u0928\u0947 \u092E\u0947\u0902 \u0938\u094D\u0935\u093E\u0907\u092A \u0915\u0930\u0947\u0902\u0964',
    pkFullTime: '\u092B\u093C\u0941\u0932 \u091F\u093E\u0907\u092E',
    pkSuddenDeath: '\u0938\u0921\u0928 \u0921\u0947\u0925',
    pkYourShotKick: '\u0906\u092A\u0915\u093E \u0936\u0949\u091F \u00B7 \u0915\u093F\u0915 {n} / 5 \u2014 \u0936\u0942\u091F \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0938\u094D\u0935\u093E\u0907\u092A \u0915\u0930\u0947\u0902',
    pkBotShootsKick: '\u092C\u0949\u091F \u0936\u0942\u091F \u0915\u0930\u0924\u093E \u0939\u0948 \u00B7 \u0915\u093F\u0915 {n} / 5 \u2014 \u0921\u093E\u0907\u0935 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0938\u094D\u0935\u093E\u0907\u092A \u0915\u0930\u0947\u0902!',
    pkYourShotSD: '\u0938\u0921\u0928 \u0921\u0947\u0925 \u00B7 \u0906\u092A\u0915\u093E \u0936\u0949\u091F \u2014 \u0938\u094D\u0935\u093E\u0907\u092A \u0915\u0930\u0947\u0902!',
    pkBotShootsSD: '\u0938\u0921\u0928 \u0921\u0947\u0925 \u00B7 \u092C\u0949\u091F \u0936\u0942\u091F \u0915\u0930\u0924\u093E \u0939\u0948 \u2014 \u0921\u093E\u0907\u0935 \u0915\u0947 \u0932\u093F\u090F \u0938\u094D\u0935\u093E\u0907\u092A \u0915\u0930\u0947\u0902!',
    pkBotShootsMsg: '\u092C\u0949\u091F \u0936\u0942\u091F \u0915\u0930 \u0930\u0939\u093E \u0939\u0948 \u2014 \u0909\u0938\u0915\u0947 \u092E\u093E\u0930\u0924\u0947 \u0939\u0940 \u0921\u093E\u0907\u0935 \u0915\u0947 \u0932\u093F\u090F \u0938\u094D\u0935\u093E\u0907\u092A \u0915\u0930\u0947\u0902!',
    pkYourShotMsg: '\u0906\u092A\u0915\u093E \u0936\u0949\u091F \u2014 \u0915\u093F\u0938\u0940 \u0915\u094B\u0928\u0947 \u092E\u0947\u0902 \u0938\u094D\u0935\u093E\u0907\u092A \u0915\u0930\u0947\u0902\u0964',
    pkGoalMsg: '\u26BD \u0917\u094B\u0932! {zone}, {pct}% \u092A\u093E\u0935\u0930 \u092A\u0930',
    pkGoalSuffixRocket: ' \u2014 \u0915\u0940\u092A\u0930 \u0915\u0947 \u092A\u093E\u0938 \u0915\u094B\u0908 \u092E\u094C\u0915\u093E \u0928\u0939\u0940\u0902 \u0925\u093E\u0964',
    pkGoalSuffixPlaced: ' \u2014 \u0915\u094D\u092F\u093E \u0916\u0942\u092C \u0930\u0916\u093E\u0964',
    pkSavedMsg: 'बचा लिया! कीपर वहां पहुंच गया — आपने {zone} में {pct}% पावर पर मारा था।',
    pkMissOver: 'बार के ऊपर! इस पर बहुत ज़्यादा पावर था।',
    pkMissLeft: 'बाईं ओर बाहर! यह पोस्ट से मुड़कर निकल गया।',
    pkMissRight: 'दाईं ओर बाहर! यह पोस्ट से मुड़कर निकल गया।',
    pkMissTurf: 'ज़मीन में धंस गया — यह कभी चला ही नहीं।',
    pkMissPowerSuffix: ' ({pct}% \u092A\u093E\u0935\u0930)',
    pkYouFroze: '\u0906\u092A \u091C\u092E \u0917\u090F \u2014 ',
    pkYouSavedIt: 'आपने बचा लिया! {zone} शॉट को पूरा पढ़ लिया।',
    pkBotScores: '\u26BD \u092C\u0949\u091F \u0928\u0947 \u0917\u094B\u0932 \u0915\u093F\u092F\u093E\u0964 \u0909\u0938\u0928\u0947 {zone} \u092E\u0947\u0902 \u0930\u0916\u093E\u0964',
    zone_tl: '\u090A\u092A\u0930 \u092C\u093E\u090F\u0902',
    zone_tm: '\u090A\u092A\u0930 \u092C\u0940\u091A \u092E\u0947\u0902',
    zone_tr: '\u090A\u092A\u0930 \u0926\u093E\u090F\u0902',
    zone_bl: '\u0928\u0940\u091A\u0947 \u092C\u093E\u090F\u0902',
    zone_bm: '\u0928\u0940\u091A\u0947 \u092C\u0940\u091A \u092E\u0947\u0902',
    zone_br: '\u0928\u0940\u091A\u0947 \u0926\u093E\u090F\u0902',
    poBotMatch: 'बॉट मैच',
    poOnlineMatch: 'दोस्त के साथ खेलें · 1v1 ऑनलाइन',
    poCreateRoom: '\u0930\u0942\u092E \u092C\u0928\u093E\u090F\u0902',
    poQuickMatch: '\u26A1 \u0915\u094D\u0935\u093F\u0915 \u092E\u0948\u091A',
    poJoinRoom: '\u0930\u0942\u092E \u091C\u0949\u0907\u0928 \u0915\u0930\u0947\u0902',
    poLeaveMatch: '\u092E\u0948\u091A \u091B\u094B\u0921\u093C\u0947\u0902',
    poRoomWord: '\u0930\u0942\u092E',
    poSendCode: ' \u2014 \u092F\u0939 \u0915\u094B\u0921 \u0905\u092A\u0928\u0947 \u0926\u094B\u0938\u094D\u0924 \u0915\u094B \u092D\u0947\u091C\u0947\u0902',
    codePlaceholder: 'CODE',
    fnVsAi: 'vs AI',
    fnOnline: '1v1 ऑनलाइन',
    diffEasy: '\u0906\u0938\u093E\u0928',
    diffNormal: '\u0938\u093E\u092E\u093E\u0928\u094D\u092F',
    diffHard: '\u092E\u0941\u0936\u094D\u0915\u093F\u0932',
    feverTag: 'FEVER ×2',
    appTitle: 'LOOPI \u2014 \u0926\u0947\u0916\u0947\u0902, \u0905\u092A\u0932\u094B\u0921 \u0915\u0930\u0947\u0902, \u091C\u0928\u0930\u0947\u091F \u0915\u0930\u0947\u0902',
    placeholderHandle: 'yourname',
    ariaProfile: '\u092A\u094D\u0930\u094B\u092B\u093C\u093E\u0907\u0932',
    ariaBack: '\u0935\u093E\u092A\u0938',
    ariaClose: '\u092C\u0902\u0926 \u0915\u0930\u0947\u0902',
    ariaCreate: '\u092C\u0928\u093E\u090F\u0902',
    titleShareVideo: '\u0935\u0940\u0921\u093F\u092F\u094B \u0936\u0947\u092F\u0930 \u0915\u0930\u0947\u0902',
    titleGroupGame: '\u0917\u094D\u0930\u0941\u092A \u0917\u0947\u092E \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902',
    gsCode: '\u0915\u094B\u0921',
    err_OFFLINE: '\u0938\u0930\u094D\u0935\u0930 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0928\u0939\u0940\u0902 \u0939\u094B \u0930\u0939\u093E\u0964',
    err_INSUFFICIENT_CREDITS: '\u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0915\u092E \u0939\u0948\u0902\u0964',
    err_GENERATION_NOT_CONFIGURED: '\u0938\u0930\u094D\u0935\u0930 \u092A\u0930 AI \u091C\u0947\u0928\u0930\u0947\u0936\u0928 \u0905\u092D\u0940 \u091A\u093E\u0932\u0942 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964 \u0915\u0941\u091B \u092D\u0940 \u091A\u093E\u0930\u094D\u091C \u0928\u0939\u0940\u0902 \u0939\u0941\u0906\u0964',
    err_BILLING_NOT_CONFIGURED: '\u0938\u0930\u094D\u0935\u0930 \u092A\u0930 \u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0916\u0930\u0940\u0926 \u0905\u092D\u0940 \u091A\u093E\u0932\u0942 \u0928\u0939\u0940\u0902 \u0939\u0948 \u2014 \u092C\u093F\u0932\u093F\u0902\u0917 \u0915\u0949\u0928\u094D\u092B\u093C\u093F\u0917\u0930 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964',
    err_BILLING_MISCONFIGURED: '\u0938\u0930\u094D\u0935\u0930 \u092A\u0930 \u092C\u093F\u0932\u093F\u0902\u0917 \u0917\u093C\u0932\u0924 \u0915\u0949\u0928\u094D\u092B\u093C\u093F\u0917\u0930 \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u092C\u093E\u0926 \u092E\u0947\u0902 \u092B\u093F\u0930 \u0915\u094B\u0936\u093F\u0936 \u0915\u0930\u0947\u0902\u0964',
    err_LIVE_NOT_CONFIGURED: '\u0938\u0930\u094D\u0935\u0930 \u092A\u0930 \u0932\u093E\u0907\u0935 \u0938\u094D\u091F\u094D\u0930\u0940\u092E\u093F\u0902\u0917 \u0905\u092D\u0940 \u091A\u093E\u0932\u0942 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964',
    err_CANNOT_TIP_SELF: '\u0906\u092A \u0916\u0941\u0926 \u0915\u094B \u091F\u093F\u092A \u0928\u0939\u0940\u0902 \u0926\u0947 \u0938\u0915\u0924\u0947\u0964',
    err_INVALID_TIP_AMOUNT: '\u0935\u0939 \u091F\u093F\u092A \u0930\u093E\u0936\u093F \u092E\u093E\u0928\u094D\u092F \u0928\u0939\u0940\u0902 \u0939\u0948\u0964',
    err_CANNOT_GIFT_SELF: '\u0906\u092A \u0916\u0941\u0926 \u0915\u094B \u0917\u093F\u092B\u093C\u094D\u091F \u0928\u0939\u0940\u0902 \u0926\u0947 \u0938\u0915\u0924\u0947\u0964',
    err_INVALID_GIFT: '\u0905\u091C\u094D\u091E\u093E\u0924 \u0917\u093F\u092B\u093C\u094D\u091F\u0964',
    err_STREAM_ENDED: '\u092F\u0939 \u0938\u094D\u091F\u094D\u0930\u0940\u092E \u0916\u093C\u0924\u094D\u092E \u0939\u094B \u0917\u0908 \u0939\u0948\u0964',
    err_UNKNOWN_PRODUCT: '\u0905\u091C\u094D\u091E\u093E\u0924 \u0915\u094D\u0930\u0947\u0921\u093F\u091F \u092A\u0948\u0915\u0964',
    err_PURCHASE_ALREADY_PROCESSED: '\u0935\u0939 \u0916\u0930\u0940\u0926 \u092A\u0939\u0932\u0947 \u0939\u0940 \u092A\u094D\u0930\u094B\u0938\u0947\u0938 \u0939\u094B \u091A\u0941\u0915\u0940 \u0939\u0948\u0964',
    err_PURCHASE_NOT_COMPLETED: '\u0935\u0939 \u0916\u0930\u0940\u0926 \u092A\u0942\u0930\u0940 \u0928\u0939\u0940\u0902 \u0939\u0941\u0908\u0964',
    err_PURCHASE_NOT_FOUND: '\u0935\u0939 \u0916\u0930\u0940\u0926 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u0940\u0964',
    err_PURCHASE_TOKEN_REQUIRED: '\u090F\u0915 \u0916\u0930\u0940\u0926 \u091F\u094B\u0915\u0928 \u091C\u093C\u0930\u0942\u0930\u0940 \u0939\u0948\u0964',
    err_PURCHASE_VERIFICATION_FAILED: '\u0935\u0939 \u0916\u0930\u0940\u0926 \u0935\u0947\u0930\u0940\u092B\u093C\u093E\u0908 \u0928\u0939\u0940\u0902 \u0939\u094B \u0938\u0915\u0940\u0964',
    err_BILLING_UPSTREAM_ERROR: '\u092C\u093F\u0932\u093F\u0902\u0917 \u0938\u0947\u0935\u093E \u0938\u0947 \u0905\u092D\u0940 \u0938\u0902\u092A\u0930\u094D\u0915 \u0928\u0939\u0940\u0902 \u0939\u094B \u0930\u0939\u093E\u0964 \u0915\u0943\u092A\u092F\u093E \u092C\u093E\u0926 \u092E\u0947\u0902 \u092B\u093F\u0930 \u0915\u094B\u0936\u093F\u0936 \u0915\u0930\u0947\u0902\u0964',
    err_GENERATION_FAILED: '\u091C\u0947\u0928\u0930\u0947\u0936\u0928 \u092B\u093C\u0947\u0932 \u0939\u094B \u0917\u0908 \u2014 \u0906\u092A\u0915\u093E \u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0930\u093F\u092B\u093C\u0902\u0921 \u0915\u0930 \u0926\u093F\u092F\u093E \u0917\u092F\u093E\u0964',
    err_PASSWORD_CONFIRMATION_FAILED: '\u0935\u0939 \u092A\u093E\u0938\u0935\u0930\u094D\u0921 \u092E\u0947\u0932 \u0928\u0939\u0940\u0902 \u0916\u093E\u0924\u093E \u2014 \u0905\u0915\u093E\u0909\u0902\u091F \u0921\u093F\u0932\u0940\u091F \u0928\u0939\u0940\u0902 \u0939\u0941\u0906\u0964',
    err_GAME_HUB_UNAVAILABLE: '\u0917\u0947\u092E\u094D\u0938 \u0905\u092D\u0940 \u0909\u092A\u0932\u092C\u094D\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948\u0902\u0964',
    pongWin: 'आप जीते',
    pongLose: '\u092C\u0949\u091F \u091C\u0940\u0924\u093E',
    ariaNewMessage: '\u0928\u092F\u093E \u092E\u0948\u0938\u0947\u091C',
    notifications: '\u0928\u094B\u091F\u093F\u092B\u093C\u093F\u0915\u0947\u0936\u0928',
    notifTitle: '\u0928\u094B\u091F\u093F\u092B\u093C\u093F\u0915\u0947\u0936\u0928',
    notifEmpty: '\u0905\u092D\u0940 \u092F\u0939\u093E\u0902 \u0915\u0941\u091B \u0928\u0939\u0940\u0902 \u2014 \u092B\u093C\u0949\u0932\u094B, \u0930\u093F\u0915\u094D\u0935\u0947\u0938\u094D\u091F, \u092E\u0948\u0938\u0947\u091C \u0914\u0930 \u0932\u093E\u0907\u0915\u094D\u0938 \u092F\u0939\u093E\u0902 \u0906\u090F\u0902\u0917\u0947\u0964',
    notifMarkAllRead: '\u0938\u092C \u092A\u0922\u093C\u093E \u0939\u0941\u0906 \u092E\u093E\u0930\u094D\u0915 \u0915\u0930\u0947\u0902',
    follow: '\u092B\u093C\u0949\u0932\u094B',
    followingBtn: '\u092B\u093C\u0949\u0932\u094B\u0907\u0902\u0917',
    requestedBtn: '\u0930\u093F\u0915\u094D\u0935\u0947\u0938\u094D\u091F \u092D\u0947\u091C\u093E',
    approve: '\u092E\u0902\u091C\u093C\u0942\u0930 \u0915\u0930\u0947\u0902',
    decline: '\u092E\u0928\u093E \u0915\u0930\u0947\u0902',
    ntf_follow_request: '{name} \u0906\u092A\u0915\u094B \u092B\u093C\u0949\u0932\u094B \u0915\u0930\u0928\u093E \u091A\u093E\u0939\u0924\u093E \u0939\u0948',
    ntf_follow_accepted: '{name} \u0928\u0947 \u0906\u092A\u0915\u0940 \u092B\u093C\u0949\u0932\u094B \u0930\u093F\u0915\u094D\u0935\u0947\u0938\u094D\u091F \u0938\u094D\u0935\u0940\u0915\u093E\u0930 \u0915\u0930 \u0932\u0940',
    ntf_new_follower: '{name} \u0928\u0947 \u0906\u092A\u0915\u094B \u092B\u093C\u0949\u0932\u094B \u0915\u0930\u0928\u093E \u0936\u0941\u0930\u0942 \u0915\u093F\u092F\u093E',
    ntf_message: '{name} \u0928\u0947 \u0906\u092A\u0915\u094B \u090F\u0915 \u092E\u0948\u0938\u0947\u091C \u092D\u0947\u091C\u093E',
    ntf_like: '{name} \u0928\u0947 \u0906\u092A\u0915\u093E \u0935\u0940\u0921\u093F\u092F\u094B \u0932\u093E\u0907\u0915 \u0915\u093F\u092F\u093E',
    ntf_comment: '{name} \u0928\u0947 \u0906\u092A\u0915\u0947 \u0935\u0940\u0921\u093F\u092F\u094B \u092A\u0930 \u0915\u092E\u0947\u0902\u091F \u0915\u093F\u092F\u093E',
    ntf_live_started: '{name} \u0932\u093E\u0907\u0935 \u0906\u092F\u093E',
    ntf_game_invite: '{name} \u0928\u0947 \u090F\u0915 \u0917\u094D\u0930\u0941\u092A \u0917\u0947\u092E \u0916\u094B\u0932\u093E',
    ntf_competition_result: '\u0906\u092A\u0928\u0947 \u0935\u0940\u0915\u0932\u0940 \u092A\u094D\u0930\u0924\u093F\u092F\u094B\u0917\u093F\u0924\u093E \u091C\u0940\u0924 \u0932\u0940! \u2726 {n} \u0915\u094D\u0930\u0947\u0921\u093F\u091F \u0906\u092A\u0915\u0947 \u092C\u0948\u0932\u0947\u0902\u0938 \u092E\u0947\u0902 \u0939\u0948\u0902\u0964',
    privacyTitle: '\u0905\u0915\u093E\u0909\u0902\u091F \u092A\u094D\u0930\u093E\u0907\u0935\u0947\u0938\u0940',
    privacyPublic: '\u092A\u092C\u094D\u0932\u093F\u0915',
    privacyPrivate: '\u092A\u094D\u0930\u093E\u0907\u0935\u0947\u091F',
    privacyPublicNote: '\u0915\u094B\u0908 \u092D\u0940 \u0906\u092A\u0915\u0940 \u092A\u094D\u0930\u094B\u092B\u093C\u093E\u0907\u0932 \u0914\u0930 \u0935\u0940\u0921\u093F\u092F\u094B \u0926\u0947\u0916 \u0938\u0915\u0924\u093E \u0939\u0948, \u0914\u0930 \u0924\u0941\u0930\u0902\u0924 \u0906\u092A\u0915\u094B \u092B\u093C\u0949\u0932\u094B \u0915\u0930 \u0938\u0915\u0924\u093E \u0939\u0948\u0964',
    privacyPrivateNote: '\u0938\u093F\u0930\u094D\u092B\u093C \u0935\u0947 \u092B\u093C\u0949\u0932\u094B\u0905\u0930\u094D\u0938 \u091C\u093F\u0928\u094D\u0939\u0947\u0902 \u0906\u092A \u092E\u0902\u091C\u093C\u0942\u0930 \u0915\u0930\u0947\u0902, \u0906\u092A\u0915\u0947 \u0935\u0940\u0921\u093F\u092F\u094B \u0914\u0930 \u092A\u0942\u0930\u0940 \u092A\u094D\u0930\u094B\u092B\u093C\u093E\u0907\u0932 \u0926\u0947\u0916 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964 \u092B\u093C\u0949\u0932\u094B \u0930\u093F\u0915\u094D\u0935\u0947\u0938\u094D\u091F \u092C\u0928 \u091C\u093E\u0924\u0947 \u0939\u0948\u0902 \u091C\u093F\u0928\u094D\u0939\u0947\u0902 \u0906\u092A \u092E\u0902\u091C\u093C\u0942\u0930 \u092F\u093E \u092E\u0928\u093E \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964',
    privateAccount: '\u092F\u0939 \u0905\u0915\u093E\u0909\u0902\u091F \u092A\u094D\u0930\u093E\u0907\u0935\u0947\u091F \u0939\u0948',
    followToSee: '\u0909\u0928\u0915\u0947 \u0935\u0940\u0921\u093F\u092F\u094B \u0926\u0947\u0916\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u0907\u0938 \u0905\u0915\u093E\u0909\u0902\u091F \u0915\u094B \u092B\u093C\u0949\u0932\u094B \u0915\u0930\u0947\u0902\u0964',
    notifPrefsTitle: '\u0928\u094B\u091F\u093F\u092B\u093C\u093F\u0915\u0947\u0936\u0928',
    notifPrefsNote: '\u091A\u0941\u0928\u0947\u0902 \u0915\u093F \u0906\u092A\u0915\u0947 \u0907\u0928\u092C\u0949\u0915\u094D\u0938 \u092E\u0947\u0902 \u0915\u094D\u092F\u093E \u0906\u090F\u0964 \u092C\u0902\u0926 \u0915\u093F\u090F \u0917\u090F \u091F\u093E\u0907\u092A \u0915\u092D\u0940 \u092C\u0928\u093E\u090F \u0939\u0940 \u0928\u0939\u0940\u0902 \u091C\u093E\u0924\u0947\u0964',
    npref_follow_request: '\u092B\u093C\u0949\u0932\u094B \u0930\u093F\u0915\u094D\u0935\u0947\u0938\u094D\u091F',
    npref_follow_accepted: '\u0930\u093F\u0915\u094D\u0935\u0947\u0938\u094D\u091F \u0938\u094D\u0935\u0940\u0915\u093E\u0930 \u0939\u0941\u0908',
    npref_new_follower: '\u0928\u090F \u092B\u093C\u0949\u0932\u094B\u0905\u0930\u094D\u0938',
    npref_message: '\u092E\u0948\u0938\u0947\u091C',
    npref_like: '\u0932\u093E\u0907\u0915\u094D\u0938',
    npref_comment: '\u0915\u092E\u0947\u0902\u091F',
    npref_live_started: '\u0932\u093E\u0907\u0935 \u0936\u0941\u0930\u0942',
    npref_game_invite: '\u0917\u0947\u092E \u0907\u0928\u0935\u093E\u0907\u091F',
    npref_competition_result: '\u092A\u094D\u0930\u0924\u093F\u092F\u094B\u0917\u093F\u0924\u093E \u092A\u0930\u093F\u0923\u093E\u092E',
    followersWord: '\u092B\u093C\u0949\u0932\u094B\u0905\u0930\u094D\u0938',
    followingWord: '\u092B\u093C\u0949\u0932\u094B\u0907\u0902\u0917',
    creatorVideos: '\u0935\u0940\u0921\u093F\u092F\u094B',
    requestSentToast: '\u0930\u093F\u0915\u094D\u0935\u0947\u0938\u094D\u091F \u092D\u0947\u091C\u0940 \u0917\u0908 \u2014 {name} \u0915\u094B \u0907\u0938\u0947 \u092E\u0902\u091C\u093C\u0942\u0930 \u0915\u0930\u0928\u093E \u0939\u094B\u0917\u093E\u0964',
    followingToast: '\u0905\u092C \u0906\u092A {name} \u0915\u094B \u092B\u093C\u0949\u0932\u094B \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902\u0964',
    unfollowedToast: '{name} \u0915\u094B \u0905\u0928\u092B\u093C\u0949\u0932\u094B \u0915\u093F\u092F\u093E\u0964',
    requestApprovedToast: '{name} \u0905\u092C \u0906\u092A\u0915\u094B \u092B\u093C\u0949\u0932\u094B \u0915\u0930 \u0930\u0939\u093E \u0939\u0948\u0964',
    requestDeclinedToast: '\u0930\u093F\u0915\u094D\u0935\u0947\u0938\u094D\u091F \u092E\u0928\u093E \u0915\u0930 \u0926\u0940 \u0917\u0908\u0964',
    privacySavedToast: '\u092A\u094D\u0930\u093E\u0907\u0935\u0947\u0938\u0940 \u0905\u092A\u0921\u0947\u091F \u0939\u094B \u0917\u0908\u0964',
    err_ACCOUNT_PRIVATE: '\u092F\u0939 \u0905\u0915\u093E\u0909\u0902\u091F \u092A\u094D\u0930\u093E\u0907\u0935\u0947\u091F \u0939\u0948\u0964',
  }
};
var lang = DEFAULT_LANG;
try {
  var savedLang = localStorage.getItem('nocta.lang');
  if (savedLang && STRINGS[savedLang]) lang = savedLang;
} catch (e) { /* private mode */ }
if (!STRINGS[lang]) lang = 'en';
function t(key) { return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key; }
function applyI18n() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : (lang === 'hi' ? 'hi' : 'en');
  document.title = t('appTitle');
  var nodes = document.querySelectorAll('[data-i18n]');
  for (var i = 0; i < nodes.length; i++) nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
  var ariaNodes = document.querySelectorAll('[data-i18n-aria]');
  for (var a = 0; a < ariaNodes.length; a++) ariaNodes[a].setAttribute('aria-label', t(ariaNodes[a].getAttribute('data-i18n-aria')));
  var titleNodes = document.querySelectorAll('[data-i18n-title]');
  for (var q = 0; q < titleNodes.length; q++) titleNodes[q].setAttribute('title', t(titleNodes[q].getAttribute('data-i18n-title')));
  var si = document.getElementById('search-input'); if (si) si.placeholder = t('searchPlaceholder');
  var gp = document.getElementById('gen-prompt'); if (gp) gp.placeholder = t('promptPlaceholder');
  var ci = document.getElementById('chat-input'); if (ci) ci.placeholder = t('messagePlaceholder');
  var oi = document.getElementById('overlay-input'); if (oi) oi.placeholder = t('messagePlaceholder');
  var coi = document.getElementById('comment-input'); if (coi) coi.placeholder = t('commentPlaceholder');
  var li = document.getElementById('lr-chat-input'); if (li) li.placeholder = t('liveChatPlaceholder');
  var ah = document.getElementById('auth-handle'); if (ah) ah.placeholder = t('placeholderHandle');
  var uc = document.getElementById('upload-caption'); if (uc) uc.placeholder = t('uploadCaptionPh');
  var dp = document.getElementById('delete-password'); if (dp) dp.placeholder = t('deletePasswordPlaceholder');
  var pc = document.getElementById('po-code'); if (pc) pc.placeholder = t('codePlaceholder');
  var fc = document.getElementById('fn-code'); if (fc) fc.placeholder = t('codePlaceholder');
  var en = document.getElementById('lang-en'), zh = document.getElementById('lang-zh'), hi = document.getElementById('lang-hi');
  if (en) en.checked = lang === 'en';
  if (zh) zh.checked = lang === 'zh';
  if (hi) hi.checked = lang === 'hi';
  renderInterestChips();
  updateSettingsMode();
  renderGamesHub();
  renderCoins();
  /* Dynamically painted regions re-render too, so a language switch in
   * Settings repaints the whole app, not just the static chrome. */
  renderFeed();
  renderRooms();
  renderLive();
  if (S.giftCatalogue) renderGiftShelf();
  renderCompetition();
  renderNotifications();
  if (S.creatorProfile) renderCreator();
  if (typeof pkPaint === 'function' && window.pk) pkPaint();
  if (S.user) { paintProfile(); renderProfileCredits(); }
  if (S.currentRoom) loadMessages(S.currentRoom);
}
function setLang(next) {
  if (!STRINGS[next]) return;
  lang = next;
  try { localStorage.setItem('nocta.lang', next); } catch (e) { /* ignore */ }
  applyI18n();
}

/* ---------------- tiny DOM helpers ---------------- */
function $(id) { return document.getElementById(id); }
function el(tag, cls, text) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}
function show(node) { node.classList.remove('hidden'); }
function hide(node) { node.classList.add('hidden'); }
var toastTimer = null;
function toast(msg) {
  var box = $('toast');
  box.textContent = msg;
  show(box);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { hide(box); }, 3200);
}
function initial(name) { return (name || '?').trim().charAt(0).toUpperCase() || '?'; }
function hueFor(seed) {
  var h = 0; var s = String(seed || '');
  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
function gradientFor(seed) {
  var h = hueFor(seed);
  return 'linear-gradient(150deg, hsl(' + h + ',72%,46%), hsl(' + ((h + 70) % 360) + ',78%,30%))';
}
function fmtCount(n) {
  n = Number(n) || 0;
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

/* ---------------- API ---------------- */
function ApiError(status, data) {
  this.status = status;
  this.data = data || {};
  this.message = (data && data.error) || ('HTTP ' + status);
}

/* Server errors carry a stable machine code in data.code. Map the main
 * ones to the user's language instead of showing raw codes/English;
 * anything else falls back to the server's own message. */
function localizedError(e) {
  if (!e) return t('err_OFFLINE');
  var code = e.data && e.data.code;
  if (code && STRINGS[lang]['err_' + code]) return t('err_' + code);
  if (code && code.indexOf('FAL_') === 0 && STRINGS[lang].err_GENERATION_FAILED) return t('err_GENERATION_FAILED');
  if (e.status === 0) return t('err_OFFLINE');
  return e.message || t('err_OFFLINE');
}

/* Level and badge names come from server/config data in English; map
 * the known ones to display names in the user's language, and pass
 * anything unknown through untouched. */
function levelDisplayName(name) {
  var byName = { 'Starter': 'lvlName_starter', 'Rising': 'lvlName_rising', 'Creator': 'lvlName_creator',
    'Pro Creator': 'lvlName_procreator', 'Star Creator': 'lvlName_starcreator' };
  return byName[name] ? t(byName[name]) : name;
}
function badgeDisplayName(b) {
  if (b && b.id && STRINGS[lang]['badge_' + b.id]) return t('badge_' + b.id);
  return (b && b.name) || '';
}
function earnLabel(e) {
  var byAction = { upload: 'earnUpload', aiGeneration: 'earnGenerate', firstUpload: 'earnFirstUpload' };
  return (e && byAction[e.action]) ? t(byAction[e.action]) : ((e && e.label) || '');
}
function zoneName(idx) {
  var keys = ['zone_tl', 'zone_tm', 'zone_tr', 'zone_bl', 'zone_bm', 'zone_br'];
  return t(keys[idx] || 'zone_bm');
}
function api(path, opts) {
  opts = opts || {};
  var headers = { 'Content-Type': 'application/json' };
  if (S.token) headers.Authorization = 'Bearer ' + S.token;
  return fetch(CONFIG.apiBase + path, {
    method: opts.method || 'GET', headers: headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  }).then(function (res) {
    if (res.status === 204) return { status: 204, data: null };
    return res.json().catch(function () { return {}; }).then(function (data) {
      if (res.status >= 400) throw new ApiError(res.status, data);
      return { status: res.status, data: data };
    });
  }, function (err) {
    var e = new ApiError(0, { code: 'OFFLINE' });
    e.message = 'Server unreachable';
    throw e;
  });
}

/* ---------------- state ---------------- */
var S = {
  feedTab: 'foryou',
  token: null, user: null, demo: false, levelsInfo: null,
  comp: null, compPast: null,
  feed: [], rooms: [], liveRooms: [],
  credits: { balance: 0, packs: CREDIT_PACKS, ledger: [] },
  earnings: { balance: 0, history: [] },
  currentRoom: null, currentLive: null, liveConn: null, lkCtl: null, commentVideo: null,
  giftCatalogue: null, liveChatTimer: null, liveChatSeen: {},
  genDuration: 10, overlayOpen: false, overlaySeen: false,
  pickedInterests: [],
  notifs: [], notifUnread: 0, creatorProfile: null, creatorHandle: null,
  myPrivacy: 'public', notifPrefs: null,
  myProfile: null, profileTab: 'videos', creditsReturnToGenerate: false,
  creditsNeeded: 0, currentPanel: 'home', bioUnlockStarted: false,
  roomUnread: {}, chatSeen: {}
};
try { S.token = localStorage.getItem('nocta.token') || null; } catch (e) { /* ignore */ }
function saveToken(tok) {
  S.token = tok;
  try {
    if (tok) localStorage.setItem('nocta.token', tok);
    else localStorage.removeItem('nocta.token');
  } catch (e) { /* ignore */ }
}
/* Android biometric bridge (MainActivity's LoopiBio): the session
 * token is sealed by Android Keystore and is NOT kept in
 * localStorage while biometric unlock is enabled — every app open
 * asks for the fingerprint/face prompt and unseals it in memory. */
function bioBridge() {
  return (typeof window !== 'undefined' && window.LoopiBio) ? window.LoopiBio : null;
}
function bioAvailable() {
  var b = bioBridge();
  try { return !!(b && b.available && b.available()); } catch (e) { return false; }
}
function bioEnabled() {
  var b = bioBridge();
  try { return !!(b && b.isEnabled && b.isEnabled()); } catch (e) { return false; }
}
function setMemoryToken(tok) {
  S.token = tok;
  try { localStorage.removeItem('nocta.token'); } catch (e) { /* ignore */ }
}
window.LoopiBioCallback = function (action, ok, value) {
  if (action === 'unlock') {
    if (ok && value) {
      setMemoryToken(value);
      restoreSession();
    } else {
      showScreen('screen-auth');
      var m = $('auth-msg');
      if (m) { m.textContent = t('bioFailed'); m.className = 'form-msg error'; }
    }
    return;
  }
  if (action === 'enable') {
    var msg = $('bio-msg');
    var toggle = $('bio-toggle');
    if (ok) {
      /* Sealed: the persistent local copy goes away, so the next
       * app open must pass the biometric prompt to restore it. */
      try { localStorage.removeItem('nocta.token'); } catch (e) { /* ignore */ }
      if (msg) { msg.textContent = t('bioEnabled'); msg.className = 'form-msg ok'; }
    } else {
      if (toggle) toggle.checked = false;
      if (msg) { msg.textContent = t('bioFailed'); msg.className = 'form-msg error'; }
    }
    return;
  }
  if (action === 'disable') {
    var msg2 = $('bio-msg');
    if (msg2) { msg2.textContent = t('bioDisabled'); msg2.className = 'form-msg'; }
  }
};

/* ---------------- demo seed (clearly labelled, on-device only) ---------------- */
var DEMO_CREATORS = {
  mira: { id: 'demo_mira', handle: 'mira.makes', displayName: 'Mira', creatorLevel: 4, xp: 460, avatarBg: 'linear-gradient(135deg,#7a4fd0,#5b34a8)',
    bio: 'Chaos, but make it content ✂️', followers: 86400, following: 212, privacy: 'public',
    badges: [{ id: 'streak_7', name: '7-Day Streak', icon: '🔥' }, { id: 'first_upload', name: 'First Upload', icon: '🎬' }] },
  kenji: { id: 'demo_kenji', handle: 'kenji.cooks', displayName: 'Kenji', creatorLevel: 3, xp: 210, avatarBg: 'linear-gradient(135deg,#c2452d,#93321e)',
    bio: 'Campfire cooking, zero shortcuts 🍜', followers: 45200, following: 340, privacy: 'public',
    badges: [{ id: 'level_3', name: 'Creator', icon: '⬆' }] },
  sofia: { id: 'demo_sofia', handle: 'sofia.surfs', displayName: 'Sofia', creatorLevel: 5, xp: 1240, avatarBg: 'linear-gradient(135deg,#0e9aa7,#0e7c86)',
    bio: 'Surf first, questions later 🌊', followers: 589400, following: 96, privacy: 'public',
    badges: [{ id: 'level_5', name: 'Star Creator', icon: '⭐' }, { id: 'likes_100', name: '100 Likes', icon: '❤️' }] },
  theo: { id: 'demo_theo', handle: 'theo.builds', displayName: 'Theo', creatorLevel: 2, xp: 80, avatarBg: 'linear-gradient(135deg,#b07d10,#8a610b)',
    bio: 'Building things in the jungle 🔨', followers: 3200, following: 410, privacy: 'private', badges: [] },
  lana: { id: 'demo_lana', handle: 'lana.audrey', displayName: 'Lana & Audrey', creatorLevel: 3, xp: 300, avatarBg: 'linear-gradient(135deg,#3f6fb5,#2c4f85)',
    bio: 'Jungle camp diaries 🌿', followers: 128900, following: 158, privacy: 'public',
    badges: [{ id: 'first_upload', name: 'First Upload', icon: '🎬' }] }
};
/* Demo follow states (handle -> 'following' | 'requested'); the base
 * set mirrors DEMO_FOLLOWING. Theo's account is PRIVATE in the demo,
 * so his profile demonstrates the locked state + request flow. */
var DEMO_FOLLOW_STATE = { 'kenji.cooks': 'following', 'lana.audrey': 'following' };
/* Demo inbox seed — clearly demo data, on-device only. Mira's follow
 * request is actionable (approve/decline) so the flow can be tried. */
var DEMO_NOTIFS = [
  { id: 'dntf_1', type: 'follow_request', read: false, createdAt: Date.now() - 12 * 60000,
    actor: { id: 'demo_mira', handle: 'mira.makes', displayName: 'Mira' }, meta: { requestId: 'dfrq_1' } },
  { id: 'dntf_2', type: 'message', read: false, createdAt: Date.now() - 52 * 60000,
    actor: { id: 'demo_kenji', handle: 'kenji.cooks', displayName: 'Kenji' }, meta: { roomId: 'demo_room2' } },
  { id: 'dntf_3', type: 'like', read: true, createdAt: Date.now() - 26 * 3600000,
    actor: { id: 'demo_sofia', handle: 'sofia.surfs', displayName: 'Sofia' }, meta: { videoId: 'demo_v1' } }
];
function demoVideo(id, owner, kind, emoji, caption, hashtags, likes, comments, prompt, clip, info) {
  return {
    id: id, demo: true, kind: kind, sourceUrl: null, prompt: prompt || null,
    clip: clip || null, info: info || null,
    durationSec: kind === 'ai' ? 10 : 15, caption: caption, hashtags: hashtags,
    likeCount: likes, commentCount: comments,
    owner: { id: owner.id, handle: owner.handle, displayName: owner.displayName,
      creatorLevel: owner.creatorLevel, levelName: levelForLevel(owner.creatorLevel).name, avatarBg: owner.avatarBg || null,
      badges: owner.badges || [] }
  };
}
/* Demo feed — every item is a REAL playing video (Kay's own Shorts,
 * recompressed into clips.js / app/clips/). Item 1 reproduces the
 * approved sample composition exactly: sofia.surfs, surf, FILMED chip,
 * L5 · STAR CREATOR, the Ocean Beach glass info chip, 84.2k / 1,204. */
var DEMO_FEED = [
  demoVideo('demo_v1', DEMO_CREATORS.sofia, 'upload', '🏄‍♀️', 'Dawn patrol — biggest set of the morning, filmed on my phone and posted in one tap. Your clip could be here next.', [], 84200, 1204,
    null, 'beach', 'Ocean Beach · 6:48 AM · shot on phone'),
  demoVideo('demo_v2', DEMO_CREATORS.kenji, 'upload', '🍜', 'Jungle camp breakfast, cooked on the fire', ['food', 'camp'], 8930, 156,
    null, 'cooking'),
  demoVideo('demo_v3', DEMO_CREATORS.mira, 'ai', '🌃', 'POV: the strip at 2am', ['ai', 'travel'], 15220, 402,
    'two friends walking a neon boulevard at night, cinematic handheld, 10 seconds', 'vegas'),
  demoVideo('demo_v4', DEMO_CREATORS.lana, 'upload', '🌿', 'Jungle spa day — mud, steam, zero emails', ['camp', 'spa'], 4210, 88,
    null, 'spa'),
  demoVideo('demo_v5', DEMO_CREATORS.theo, 'upload', '🪵', 'I hid behind the firewood. Worth it.', ['prank', 'camp'], 3120, 45,
    null, 'firewood'),
  demoVideo('demo_v6', DEMO_CREATORS.mira, 'ai', '🕷️', 'The spider was fake. The scream was real.', ['ai', 'comedy'], 22140, 631,
    'a jungle camp morning, a fake spider prank, hidden camera comedy', 'spider'),
  demoVideo('demo_v7', DEMO_CREATORS.kenji, 'ai', '🍋', 'Sour drink challenge — first sip face', ['ai', 'food'], 6640, 97,
    'first sip of an extremely sour jungle drink, reaction cam, slow zoom', 'sour'),
  demoVideo('demo_v8', DEMO_CREATORS.sofia, 'upload', '🏐', 'Beach volleyball — match point', ['surf', 'volleyball'], 9870, 173,
    null, 'volley')
];
var DEMO_FOLLOWING = ['kenji.cooks', 'lana.audrey'];
var DEMO_ROOMS = [
  { id: 'demo_room_dm', type: 'dm', name: 'Mira', otherHandle: 'mira.makes', hasPassword: false, demo: true },
  { id: 'demo_room_group', type: 'group', name: 'Weekend Creators', hasPassword: false, demo: true },
  { id: 'demo_room_open', type: 'open', name: '#prompt-party', hasPassword: false, demo: true },
  { id: 'demo_room_private', type: 'private', name: 'Studio (friends only)', hasPassword: true, demo: true }
];
var DEMO_MESSAGES = {
  demo_room_dm: [
    { id: 'dm1', sender: DEMO_CREATORS.mira, type: 'text', text: 'Did you see the remix of my panda video??', mine: false },
    { id: 'dm2', sender: DEMO_CREATORS.mira, type: 'video', videoId: 'demo_v3', mine: false }
  ],
  demo_room_group: [
    { id: 'gm1', sender: DEMO_CREATORS.theo, type: 'text', text: 'Day 3 of the cabin build is up 🏠', mine: false },
    { id: 'gm2', sender: DEMO_CREATORS.kenji, type: 'video', videoId: 'demo_v2', mine: false },
    { id: 'gm3', sender: DEMO_CREATORS.sofia, type: 'text', text: 'That knife work is illegal in 12 countries', mine: false }
  ],
  demo_room_open: [
    { id: 'om1', sender: DEMO_CREATORS.mira, type: 'text', text: 'Today\'s prompt battle: "breakfast in zero gravity" 🥐🚀', mine: false }
  ],
  demo_room_private: [
    { id: 'pm1', sender: DEMO_CREATORS.lana, type: 'text', text: 'Welcome to the studio room — rough cuts only, be kind', mine: false }
  ]
};
var DEMO_LIVE = [
  { id: 'demo_live1', demo: true, title: 'Cooking stream — knife skills Q&A', streamer: DEMO_CREATORS.kenji, viewers: 12408, emoji: '👨‍🍳' },
  { id: 'demo_live2', demo: true, title: 'Building a hut in the jungle, day 4', streamer: DEMO_CREATORS.lana, viewers: 3211, emoji: '🎋' },
  { id: 'demo_live3', demo: true, title: 'Sunset surf cam + chat', streamer: DEMO_CREATORS.sofia, viewers: 1876, emoji: '🌅' }
];
var DEMO_LIVE_CHAT = [
  { who: 'surf.kid', text: 'that knife flip was clean' },
  { who: 'noodle_fan', text: 'recipe please!!' },
  { who: 'mira.makes', text: 'the sound design on this stream is elite' },
  { who: 'quietviewer', text: 'been here an hour, zero regrets' }
];
/* Demo competition state: DORMANT on purpose — it mirrors the real
 * gate (opens at 500 creators) with a sample count, so the demo shows
 * exactly what early users see. On a real account the card is driven
 * by GET /v1/competitions/current + /past instead. */
var DEMO_COMP = {
  active: false, totalUsers: 312, minUsers: 500, prizeCredits: 25,
  weekId: 'demo-week', prompt: 'tigers eating ice creams',
  startsAt: Date.now() - 2 * 86400000, endsAt: Date.now() + 3 * 86400000 + 5 * 3600000,
  status: 'running', entries: 0, myEntry: null, results: null
};
var DEMO_COMP_PAST = [];
var DEMO_COMP_MY_VIDEOS = [
  { id: 'demo_my_ai1', kind: 'ai', caption: 'Tigers vs ice cream — my take', prompt: 'tigers eating ice creams', likeCount: 42 },
  { id: 'demo_my_ai2', kind: 'ai', caption: 'Neon panda outtake', prompt: 'a panda skateboarding through neon Tokyo at night', likeCount: 17 }
];
/* The demo account's own profile content (on-device only): two real
 * playing clips so the Instagram-style grid is never a placeholder. */
var DEMO_ME_OWNER = { id: 'demo_me', handle: 'you.demo', displayName: 'You (demo)', creatorLevel: 2, xp: 80, avatarBg: 'linear-gradient(135deg,#3f6fb5,#7a4fd0)', badges: [] };
var DEMO_MY_VIDEOS = [
  demoVideo('demo_my_v1', DEMO_ME_OWNER, 'upload', '🌊', 'My first LOOPI upload — beach day', ['mine'], 128, 9, null, 'volley'),
  demoVideo('demo_my_v2', DEMO_ME_OWNER, 'upload', '♨️', 'Jungle spa reset', ['mine', 'spa'], 86, 4, null, 'spa')
];
var DEMO_COMMENTS = [
  { who: 'theo.builds', text: 'The timing on this is perfect 😂' },
  { who: 'sofia.surfs', text: 'Instant classic' },
  { who: 'kenji.cooks', text: 'How is nobody talking about the lighting' }
];

/* ---------------- levels (mirror of src/config.js) ---------------- */
function levelForLevel(n) {
  for (var i = 0; i < CREATOR_LEVELS.length; i++) if (CREATOR_LEVELS[i].level === n) return CREATOR_LEVELS[i];
  return CREATOR_LEVELS[0];
}
function levelForXp(xp) {
  var cur = CREATOR_LEVELS[0];
  for (var i = 0; i < CREATOR_LEVELS.length; i++) if ((xp || 0) >= CREATOR_LEVELS[i].minXp) cur = CREATOR_LEVELS[i];
  return cur;
}
function boostLabel(boost) {
  if (!boost) return '+0% ' + t('reachBoost');
  if (boost < 1) return '+' + Math.round(boost * 100) + '% ' + t('reachBoost');
  return '×' + (1 + boost) + ' ' + t('reachBoost');
}

/* ---------------- screens + tabs ---------------- */
var PANELS = ['home', 'discover', 'live', 'games', 'inbox', 'profile', 'settings', 'chat', 'live-room',
  'notifications', 'creator',
  'game-penalty', 'game-pong', 'game-volley', 'game-poker', 'game-foodninja', 'game-volfield'];
function showScreen(id) {
  var screens = ['screen-auth', 'screen-onboarding', 'screen-main'];
  for (var i = 0; i < screens.length; i++) {
    if (screens[i] === id) show($(screens[i])); else hide($(screens[i]));
  }
  updateBottomBar();
}
function showPanel(name) {
  S.currentPanel = name;
  if (name !== 'live-room') stopLiveVideo();
  if (name !== 'chat') { stopVoiceTranscriptPoll(); stopVoicePlayback(); stopVoiceRecording(false); }
  for (var i = 0; i < PANELS.length; i++) {
    var p = $('panel-' + PANELS[i]);
    if (p) { if (PANELS[i] === name) show(p); else hide(p); }
  }
  var tabFor = name.indexOf('game-') === 0 ? 'games' : name;
  var tabs = document.querySelectorAll('#nav-menu .menu-item');
  for (var j = 0; j < tabs.length; j++) {
    tabs[j].classList.toggle('active', tabs[j].getAttribute('data-tab') === tabFor);
  }
  hide($('nav-menu'));
  updateBottomBar();
  if (name === 'home') { maybeShowBubble(); playVisibleVideo(); rtPaintPill(); }
  if (name === 'games') renderGamesHub();
  if (name === 'discover') { renderCompetition(); loadCompetitions(); }
}
/* The 3-button bar (Kay 22:25): Feed · Profile · Search. It hides
 * while a sheet, the chat overlay, the create panel or a focused
 * input/keyboard owns the bottom of the screen. */
var BOTTOM_HIDE_PANELS = { chat: 1, 'live-room': 1 };
function anySheetOpen() {
  var ids = ['create-panel', 'comments-sheet', 'delete-sheet', 'challenge-picker',
    'gs-overlay', 'people-sheet', 'edit-profile-sheet', 'credits-sheet', 'music-sheet'];
  for (var i = 0; i < ids.length; i++) {
    var n = $(ids[i]);
    if (n && !n.classList.contains('hidden')) return true;
  }
  return false;
}
function updateBottomBar() {
  var bar = $('bottom-bar');
  if (!bar) return;
  var mainVisible = !$('screen-main').classList.contains('hidden');
  var activeElement = document.activeElement;
  var inputOpen = !!activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(activeElement.tagName || '');
  var hideBar = !mainVisible || !!BOTTOM_HIDE_PANELS[S.currentPanel] ||
    String(S.currentPanel || '').indexOf('game-') === 0 ||
    S.overlayOpen || anySheetOpen() || inputOpen;
  bar.classList.toggle('hidden', hideBar);
  var map = { home: 'home', profile: 'profile', creator: 'profile', discover: 'discover' };
  var active = map[S.currentPanel] || '';
  var items = bar.querySelectorAll('.bottom-item');
  for (var i = 0; i < items.length; i++) {
    items[i].classList.toggle('active', items[i].getAttribute('data-bottom-nav') === active);
  }
}
function wireBottomBar() {
  var bar = $('bottom-bar');
  if (!bar) return;
  var items = bar.querySelectorAll('.bottom-item');
  for (var i = 0; i < items.length; i++) {
    items[i].addEventListener('click', function () {
      var dest = this.getAttribute('data-bottom-nav');
      if (dest === 'profile') { showPanel('profile'); refreshProfile(); return; }
      showPanel(dest);
    });
  }
  document.addEventListener('focusin', function () { setTimeout(updateBottomBar, 60); });
  document.addEventListener('focusout', function () { setTimeout(updateBottomBar, 120); });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () { updateBottomBar(); });
  }
}
function wireTabs() {
  /* the ⋯ menu holds every destination (Kay: main screen is videos
   * only — no bottom nav). Items navigate exactly like the old tabs. */
  var menuBtn = $('menu-btn');
  var menu = $('nav-menu');
  menuBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });
  document.addEventListener('click', function (e) {
    if (!menu.classList.contains('hidden') && !menu.contains(e.target) && e.target !== menuBtn) {
      hide(menu);
    }
  });
  var items = document.querySelectorAll('#nav-menu .menu-item');
  for (var i = 0; i < items.length; i++) {
    items[i].addEventListener('click', function () {
      var name = this.getAttribute('data-tab');
      hide(menu);
      if (name === 'create') { openCreate(); return; }
      if (name === 'feed') {
        showPanel('discover');
        var g = $('explore-grid');
        if (g) g.scrollIntoView({ block: 'start' });
        return;
      }
      if (name === 'settings') { showPanel('settings'); updateSettingsMode(); return; }
      if (name === 'profile') { showPanel('profile'); refreshProfile(); return; }
      if (name === 'notifications') {
        showPanel('notifications');
        loadNotifications();
        /* viewing the inbox clears the badge shortly after the rows
         * paint, so the user sees what was new before it clears */
        setTimeout(markAllNotifsRead, 900);
        return;
      }
      showPanel(name);
    });
  }
  /* feed chrome: LIVE pill -> live floor, search -> discover,
   * Following / For You tabs filter the demo feed */
  $('live-pill').addEventListener('click', function () { showPanel('live'); });
  $('new-posts-pill').addEventListener('click', rtShowPendingPosts);
  $('search-btn').addEventListener('click', function () { showPanel('discover'); });
  $('ftab-following').addEventListener('click', function () { setFeedTab('following'); });
  $('ftab-foryou').addEventListener('click', function () { setFeedTab('foryou'); });
  var backs = document.querySelectorAll('.back-home');
  for (var b = 0; b < backs.length; b++) {
    backs[b].addEventListener('click', function () { showPanel('home'); });
  }
  $('settings-btn').addEventListener('click', function () { showPanel('settings'); updateSettingsMode(); });
  $('settings-back').addEventListener('click', function () { showPanel('profile'); });
  var radios = document.querySelectorAll('input[name="lang"]');
  for (var r = 0; r < radios.length; r++) {
    radios[r].addEventListener('change', function () { if (this.checked) setLang(this.value); });
  }
  var b2 = $('chat-bubble-2');
  if (b2) b2.addEventListener('click', function () { showPanel('inbox'); });
}
function setFeedTab(tab) {
  S.feedTab = tab;
  $('ftab-following').classList.toggle('on', tab === 'following');
  $('ftab-foryou').classList.toggle('on', tab === 'foryou');
  /* Bug fix (QA #4): the Following tab used to just re-render the same
   * For You items (its only filter was a hardcoded demo handle list).
   * Real accounts now fetch the server-filtered following feed. */
  if (!S.demo && S.token) loadFeed(); else renderFeed();
}
function updateSettingsMode() {
  var n = $('settings-mode');
  if (n) n.textContent = S.demo ? t('modeDemo') : t('modeLive');
  paintSettings();
}

/* ---------------- notifications ----------------
 * In-app inbox (server records; demo seed on-device). Unread badges
 * live on the ⋯ menu button (a dot) and on the menu's Notifications
 * row (a count) — the feed itself gains NO new chrome. Opening the
 * inbox marks everything read (rows keep their unread styling until
 * the next render, so the user still sees what was new). */
var NOTIF_TYPES = ['follow_request', 'follow_accepted', 'new_follower', 'message',
  'like', 'comment', 'live_started', 'game_invite', 'competition_result'];
function refreshNotifBadge() {
  var b = $('menu-notif-badge'), d = $('menu-btn-dot');
  if (b) {
    b.textContent = S.notifUnread > 99 ? '99+' : String(S.notifUnread);
    b.classList.toggle('hidden', !S.notifUnread);
  }
  if (d) d.classList.toggle('hidden', !S.notifUnread);
}
function agoText(ts) {
  var s = Math.max(1, Math.round((Date.now() - (ts || Date.now())) / 1000));
  if (s < 60) return s + 's';
  var m = Math.round(s / 60); if (m < 60) return m + 'm';
  var h = Math.round(m / 60); if (h < 24) return h + 'h';
  return Math.round(h / 24) + 'd';
}
function loadNotifications() {
  if (S.demo || !S.token) {
    S.notifs = DEMO_NOTIFS;
    S.notifUnread = S.notifs.filter(function (n) { return !n.read; }).length;
    renderNotifications();
    refreshNotifBadge();
    return;
  }
  api('/v1/notifications?limit=50').then(function (r) {
    S.notifs = r.data.notifications || [];
    S.notifUnread = r.data.unread || 0;
    renderNotifications();
    refreshNotifBadge();
  }).catch(function () { renderNotifications(); });
}
function markAllNotifsRead() {
  if (S.demo || !S.token) {
    S.notifs.forEach(function (n) { n.read = true; });
    S.notifUnread = 0;
    refreshNotifBadge();
    return;
  }
  api('/v1/notifications/read-all', { method: 'POST' }).then(function () {
    S.notifs.forEach(function (n) { n.read = true; });
    S.notifUnread = 0;
    refreshNotifBadge();
  }).catch(function () { /* badge stays honest on next load */ });
}
function renderNotifications() {
  var list = $('notif-list');
  if (!list) return;
  list.innerHTML = '';
  /* "Mark all read" on an empty inbox is a dead control (QA #18). */
  var readAllBtn = $('notif-read-all');
  if (readAllBtn) readAllBtn.classList.toggle('hidden', !S.notifs.length);
  if (!S.notifs.length) {
    list.appendChild(el('p', 'sub', t('notifEmpty')));
    return;
  }
  S.notifs.forEach(function (n) {
    var row = el('div', 'notif-row' + (n.read ? '' : ' unread'));
    var av = el('span', 'mini-avatar', initial(n.actor ? n.actor.displayName : '?'));
    av.style.background = (n.actor && n.actor.avatarBg) || gradientFor(n.actor ? n.actor.handle : n.id);
    row.appendChild(av);
    var body = el('div', 'notif-body');
    var name = n.actor ? (n.actor.displayName || n.actor.handle) : '';
    var txt = t('ntf_' + n.type)
      .replace('{name}', name)
      .replace('{n}', (n.meta && n.meta.prizeCredits != null) ? n.meta.prizeCredits : '');
    var text = el('div', 'notif-text');
    if (name && txt.indexOf(name) === 0) {
      text.appendChild(el('b', null, name));
      text.appendChild(document.createTextNode(txt.slice(name.length)));
    } else {
      text.textContent = txt;
    }
    body.appendChild(text);
    body.appendChild(el('div', 'notif-time', agoText(n.createdAt)));
    if (n.type === 'follow_request' && !(n.meta && n.meta.resolved)) {
      var actions = el('div', 'notif-actions');
      var ok = el('button', 'primary', t('approve'));
      ok.addEventListener('click', function () { notifAct(n, 'approve'); });
      var no = el('button', 'ghost', t('decline'));
      no.addEventListener('click', function () { notifAct(n, 'decline'); });
      actions.appendChild(ok);
      actions.appendChild(no);
      body.appendChild(actions);
    }
    row.appendChild(body);
    if (!n.read) row.appendChild(el('span', 'notif-unread-dot'));
    list.appendChild(row);
  });
}
function notifAct(n, action) {
  var requestId = n.meta && n.meta.requestId;
  var actorName = n.actor ? (n.actor.displayName || n.actor.handle) : '';
  var done = function () {
    n.read = true;
    n.meta = Object.assign({}, n.meta || {}, { resolved: action === 'approve' ? 'approved' : 'declined' });
    if (action === 'approve') {
      if (n.actor) DEMO_FOLLOW_STATE[n.actor.handle] = 'following';
      toast(t('requestApprovedToast').replace('{name}', actorName));
    } else {
      toast(t('requestDeclinedToast'));
    }
    renderNotifications();
  };
  if (S.demo || !S.token || !requestId) { done(); return; }
  api('/v1/follow-requests/' + requestId + '/' + action, { method: 'POST' })
    .then(done)
    .catch(function (e) { toast(localizedError(e)); });
}

/* ---------------- shared profile pieces ---------------- */
function profileLevelLine(u) {
  if (!u) return '';
  var lv = levelForLevel(u.creatorLevel || levelForXp(u.xp || 0).level);
  var name = levelDisplayName(lv.name);
  return 'L' + lv.level + ' · ' + name + (typeof u.xp === 'number' ? ' — ' + u.xp + ' XP' : '');
}
function profileVideoTile(v) {
  var sq = el('div', 'square profile-square');
  var sp = posterSrc(v);
  if (sp) {
    var img = document.createElement('img');
    img.src = sp; img.alt = ''; img.loading = 'lazy';
    sq.appendChild(img);
  } else {
    var cs = clipSrc(v) || mediaSrc(v.sourceUrl);
    if (cs) {
      var sv = document.createElement('video');
      sv.src = cs; sv.muted = true; sv.loop = true; sv.playsInline = true;
      sv.setAttribute('playsinline', ''); sv.setAttribute('preload', 'metadata');
      sq.appendChild(sv);
    } else {
      sq.style.background = gradientFor(v.owner ? v.owner.handle : v.id);
      sq.appendChild(el('span', null, posterEmoji(v)));
    }
  }
  if (v.kind === 'ai') sq.appendChild(el('span', 'sq-ai kind-badge', '✦ AI'));
  if (v.status === 'pending') sq.appendChild(el('span', 'sq-ai kind-badge', '⏳ ' + t('modChecking')));
  if (v.status === 'rejected') sq.appendChild(el('span', 'sq-ai kind-badge', t('modRejected')));
  var meta = el('div', 'sq-meta');
  /* Real view count only (was likeCount * 7 — a fabricated number). */
  if (typeof v.viewCount === 'number') meta.appendChild(el('span', null, '▶ ' + fmtCount(v.viewCount)));
  sq.appendChild(meta);
  sq.addEventListener('click', function () { jumpToVideo(v); });
  return sq;
}
function shareProfile(u) {
  if (!u) return;
  var url = 'https://loopi-5n47.onrender.com/@' + encodeURIComponent(u.handle || '');
  var text = '@' + (u.handle || '') + ' · LOOPI';
  if (navigator.share) {
    navigator.share({ title: 'LOOPI', text: text, url: url }).catch(function () {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function () { toast(t('linkCopied')); });
  }
}
function renderPeopleRows(users) {
  var list = $('people-list');
  list.innerHTML = '';
  if (!users || !users.length) {
    list.appendChild(el('p', 'sub', t('peopleEmpty')));
    return;
  }
  users.forEach(function (u) {
    var row = el('button', 'people-row');
    var av = el('span', 'mini-avatar', initial(u.displayName));
    av.style.background = u.avatarBg || gradientFor(u.handle);
    row.appendChild(av);
    var main = el('span', 'people-main');
    main.appendChild(el('span', 'people-name', u.displayName || u.handle));
    main.appendChild(el('span', 'people-handle', '@' + (u.handle || '')));
    row.appendChild(main);
    row.addEventListener('click', function () {
      hide($('people-sheet'));
      updateBottomBar();
      if (S.user && u.id === S.user.id) { showPanel('profile'); refreshProfile(); }
      else openCreator(u);
    });
    list.appendChild(row);
  });
}
function demoPeople(kind, target) {
  var creators = Object.keys(DEMO_CREATORS).map(function (k) { return DEMO_CREATORS[k]; });
  var me = { id: 'demo_me', handle: 'you.demo', displayName: S.user ? S.user.displayName : 'You', avatarBg: DEMO_ME_OWNER.avatarBg };
  var isSelf = !target || target.id === 'demo_me' || (S.user && target.id === S.user.id);
  if (isSelf) {
    return kind === 'followers' ? [DEMO_CREATORS.mira, DEMO_CREATORS.kenji] : [DEMO_CREATORS.kenji, DEMO_CREATORS.lana];
  }
  if (kind === 'followers') return [me, DEMO_CREATORS.mira, DEMO_CREATORS.sofia].filter(function (u) { return u.id !== target.id; });
  return creators.filter(function (u) { return u.id !== target.id; }).slice(0, 3);
}
function openPeopleList(kind, target, total) {
  if (!target) return;
  $('people-title').textContent = kind === 'followers' ? t('followersWord') : t('followingWord');
  $('people-count').textContent = fmtCount(total || 0) + ' · @' + (target.handle || '');
  renderPeopleRows([]);
  show($('people-sheet'));
  updateBottomBar();
  if (S.demo || !S.token) {
    renderPeopleRows(demoPeople(kind, target));
    return;
  }
  api('/v1/users/' + encodeURIComponent(target.handle) + '/' + kind).then(function (r) {
    renderPeopleRows(r.data.users || []);
    $('people-count').textContent = fmtCount(r.data.total || total || 0) + ' · @' + (target.handle || '');
  }).catch(function (e) {
    renderPeopleRows([]);
    toast(localizedError(e));
  });
}
function closePeopleList() { hide($('people-sheet')); updateBottomBar(); }

/* ---------------- creator profiles + follows ---------------- */
function demoCreatorByHandle(handle) {
  for (var k in DEMO_CREATORS) if (DEMO_CREATORS[k].handle === handle) return DEMO_CREATORS[k];
  return null;
}
function openCreator(owner) {
  if (!owner || !owner.handle) return;
  if (S.user && owner.id === S.user.id) { showPanel('profile'); refreshProfile(); return; }
  S.creatorHandle = owner.handle;
  showPanel('creator');
  if (S.demo || !S.token) {
    var c = demoCreatorByHandle(owner.handle);
    var base = c || owner;
    var state = DEMO_FOLLOW_STATE[owner.handle] || 'none';
    var isPriv = base.privacy === 'private';
    S.creatorProfile = {
      user: {
        id: base.id, handle: base.handle, displayName: base.displayName,
        creatorLevel: base.creatorLevel, levelName: levelForLevel(base.creatorLevel || 1).name,
        xp: base.xp || 0,
        badges: base.badges || [], bio: base.bio || '', avatarBg: base.avatarBg || null,
        privacy: base.privacy || 'public', isPrivate: isPriv,
        followersCount: base.followers || 0, followingCount: base.following || 0,
        followState: state, locked: isPriv && state !== 'following'
      },
      videos: DEMO_FEED.filter(function (v) { return v.owner && v.owner.handle === owner.handle; })
    };
    renderCreator();
    return;
  }
  api('/v1/users/' + encodeURIComponent(owner.handle)).then(function (r) {
    S.creatorProfile = r.data;
    renderCreator();
  }).catch(function (e) { toast(localizedError(e)); });
}
function renderCreator() {
  var p = S.creatorProfile;
  if (!p || !p.user) return;
  var u = p.user;
  $('creator-title').textContent = '@' + u.handle;
  var av = $('creator-avatar');
  av.textContent = initial(u.displayName);
  av.style.background = u.avatarBg || gradientFor(u.handle);
  $('creator-name').textContent = u.displayName;
  $('creator-handle').textContent = '@' + u.handle;
  $('creator-private-chip').classList.toggle('hidden', !u.isPrivate);
  $('creator-bio').textContent = u.locked ? '' : (u.bio || '');
  $('creator-level-line').textContent = u.locked ? '' : profileLevelLine(u);
  $('creator-video-count').textContent = fmtCount(u.locked ? 0 : (p.videos || []).length);
  $('creator-followers-count').textContent = fmtCount(u.followersCount || 0);
  $('creator-following-count').textContent = fmtCount(u.followingCount || 0);
  var btn = $('creator-follow-btn');
  var state = u.followState || 'none';
  btn.classList.toggle('hidden', state === 'self');
  btn.classList.toggle('is-ghost', state === 'following' || state === 'requested');
  btn.textContent = state === 'following' ? t('followingBtn')
    : state === 'requested' ? t('requestedBtn') : t('follow');
  $('creator-locked').classList.toggle('hidden', !u.locked);
  document.getElementById('creator-videos-title').classList.toggle('hidden', !!u.locked);
  var grid = $('creator-grid');
  grid.innerHTML = '';
  if (!u.locked) {
    (p.videos || []).forEach(function (v) { grid.appendChild(profileVideoTile(v)); });
  }
}
function messageCreator() {
  var p = S.creatorProfile;
  if (!p || !p.user) return;
  var u = p.user;
  if (S.demo || !S.token) {
    var room = null;
    for (var i = 0; i < S.rooms.length; i++) {
      if (S.rooms[i].otherHandle === u.handle) room = S.rooms[i];
    }
    if (!room) {
      room = { id: 'demo_dm_' + u.handle, type: 'dm', name: u.displayName, otherHandle: u.handle, hasPassword: false, demo: true };
      S.rooms = [room].concat(S.rooms);
      if (!DEMO_MESSAGES[room.id]) DEMO_MESSAGES[room.id] = [];
    }
    enterChat(room);
    return;
  }
  api('/v1/dms', { method: 'POST', body: { userId: u.id } }).then(function (r) {
    var room = r.data.room;
    room.name = u.displayName;
    enterChat(room);
  }).catch(function (e) { toast(localizedError(e)); });
}
function creatorFollowToggle() {
  var p = S.creatorProfile;
  if (!p || !p.user) return;
  var u = p.user;
  var prev = u.followState || 'none';
  var apply = function (state) {
    if (state === 'following' && prev !== 'following') u.followersCount = (u.followersCount || 0) + 1;
    if (state !== 'following' && prev === 'following') u.followersCount = Math.max(0, (u.followersCount || 0) - 1);
    u.followState = state;
    u.locked = !!u.isPrivate && state !== 'following';
    if (state === 'following' && !(S.demo || !S.token)) {
      /* the server profile is authoritative once we can follow */
      api('/v1/users/' + encodeURIComponent(u.handle)).then(function (r) {
        S.creatorProfile = r.data; renderCreator();
      }).catch(function () { renderCreator(); });
    } else {
      if (state === 'following') {
        p.videos = DEMO_FEED.filter(function (v) { return v.owner && v.owner.handle === u.handle; });
      }
      renderCreator();
    }
  };
  var name = u.displayName || u.handle;
  if (S.demo || !S.token) {
    if (prev === 'following' || prev === 'requested') {
      DEMO_FOLLOW_STATE[u.handle] = 'none';
      apply('none');
      toast(t('unfollowedToast').replace('{name}', name));
    } else if (u.isPrivate) {
      DEMO_FOLLOW_STATE[u.handle] = 'requested';
      apply('requested');
      toast(t('requestSentToast').replace('{name}', name));
    } else {
      DEMO_FOLLOW_STATE[u.handle] = 'following';
      apply('following');
      toast(t('followingToast').replace('{name}', name));
    }
    return;
  }
  if (prev === 'following' || prev === 'requested') {
    api('/v1/users/' + encodeURIComponent(u.handle) + '/follow', { method: 'DELETE' })
      .then(function () { apply('none'); toast(t('unfollowedToast').replace('{name}', name)); })
      .catch(function (e) { toast(localizedError(e)); });
  } else {
    api('/v1/users/' + encodeURIComponent(u.handle) + '/follow', { method: 'POST' })
      .then(function (r) {
        apply(r.data.state || 'following');
        toast(t(r.data.state === 'requested' ? 'requestSentToast' : 'followingToast').replace('{name}', name));
      })
      .catch(function (e) { toast(localizedError(e)); });
  }
}

/* ---------------- settings: privacy + notification switches --------- */
function currentPrivacy() {
  return (S.user && S.user.privacy) || S.myPrivacy || 'public';
}
function currentPrefs() {
  var out = {};
  var stored = (S.user && S.user.notificationPrefs) || S.notifPrefs || {};
  NOTIF_TYPES.forEach(function (ty) { out[ty] = stored[ty] !== false; });
  return out;
}
function paintBioSettings() {
  var group = $('bio-settings-group');
  if (!group) return;
  var available = bioAvailable();
  group.classList.toggle('hidden', !available);
  if (!available) return;
  var toggle = $('bio-toggle');
  if (toggle) toggle.checked = bioEnabled();
}
function paintBioUnlockButton() {
  var btn = $('bio-unlock-btn');
  if (!btn) return;
  btn.classList.toggle('hidden', !(bioAvailable() && bioEnabled()));
}
function paintSettings() {
  paintBioSettings();
  var pub = $('privacy-public'), prv = $('privacy-private');
  if (!pub || !prv) return;
  var priv = currentPrivacy();
  pub.checked = priv !== 'private';
  prv.checked = priv === 'private';
  $('privacy-note').textContent = t(priv === 'private' ? 'privacyPrivateNote' : 'privacyPublicNote');
  var box = $('notif-prefs');
  if (!box) return;
  box.innerHTML = '';
  var prefs = currentPrefs();
  NOTIF_TYPES.forEach(function (ty) {
    var row = el('label', 'switch-row');
    row.appendChild(el('span', null, t('npref_' + ty)));
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = prefs[ty];
    input.setAttribute('data-npref', ty);
    input.addEventListener('change', function () { saveNotifPref(ty, this.checked); });
    row.appendChild(input);
    box.appendChild(row);
  });
}
function saveNotifPref(type, on) {
  if (!S.notifPrefs) S.notifPrefs = currentPrefs();
  S.notifPrefs[type] = on;
  if (S.user) {
    if (!S.user.notificationPrefs) S.user.notificationPrefs = {};
    S.user.notificationPrefs[type] = on;
  }
  if (S.demo || !S.token) return;
  var body = { notificationPrefs: {} };
  body.notificationPrefs[type] = on;
  api('/v1/me', { method: 'PATCH', body: body })
    .catch(function (e) { toast(localizedError(e)); });
}
function savePrivacy(value) {
  S.myPrivacy = value;
  if (S.user) S.user.privacy = value;
  paintSettings();
  if (S.demo || !S.token) { toast(t('privacySavedToast')); return; }
  api('/v1/me', { method: 'PATCH', body: { privacy: value } }).then(function (r) {
    if (r.data && r.data.user) S.user = Object.assign({}, S.user, r.data.user);
    paintSettings();
    toast(t('privacySavedToast'));
  }).catch(function (e) { toast(localizedError(e)); });
}

/* ---------------- auth ---------------- */
var authMode = 'login';
function setAuthMode(mode) {
  authMode = mode;
  $('auth-tab-login').classList.toggle('active', mode === 'login');
  $('auth-tab-register').classList.toggle('active', mode === 'register');
  if (mode === 'register') show($('register-fields')); else hide($('register-fields'));
  /* Forgot password belongs to the login side only. */
  var fk = $('auth-forgot-link'); if (fk) fk.classList.toggle('hidden', mode !== 'login');
  if (mode !== 'login') { var rp = $('reset-panel'); if (rp) hide(rp); }
  $('auth-submit').textContent = t(mode === 'login' ? 'login' : 'signup');
}
/* ---------------- password reset (QA #5) ----------------
 * The server flow existed (POST /v1/password/forgot + /reset, the
 * same one the native app uses) but the web app never wired it up —
 * a locked-out web user had no recovery at all. */
function resetMsg(text, isError) {
  var m = $('reset-msg');
  if (!m) return;
  m.textContent = text || '';
  m.className = 'form-msg' + (isError ? ' error' : '');
}
function sendResetCode() {
  var email = $('auth-email').value.trim();
  if (!email) { resetMsg('Enter your account email above first.', true); return; }
  resetMsg('Sending…');
  api('/v1/password/forgot', { method: 'POST', body: { email: email } }).then(function () {
    resetMsg('If that email has a LOOPI account, a reset code is on its way. Enter it below with your new password.');
  }).catch(function (e) { resetMsg(localizedError(e), true); });
}
function submitReset() {
  var email = $('auth-email').value.trim();
  var code = $('reset-code').value.trim();
  var newPassword = $('reset-newpw').value;
  if (!email || !code || !newPassword) { resetMsg('Email, reset code and a new password are all required.', true); return; }
  resetMsg('Updating…');
  api('/v1/password/reset', { method: 'POST', body: { email: email, code: code, newPassword: newPassword } }).then(function () {
    hide($('reset-panel'));
    $('reset-code').value = ''; $('reset-newpw').value = '';
    authMsg('Password updated — log in with your new password.');
  }).catch(function (e) { resetMsg(localizedError(e), true); });
}
/* Change password while signed in (Settings → Password & security),
 * POST /v1/me/change-password — the endpoint existed; the web
 * Settings screen never offered it. */
function submitChangePassword() {
  var msg = $('chpw-msg');
  var setMsg = function (text, isError) { if (msg) { msg.textContent = text || ''; msg.className = 'form-msg' + (isError ? ' error' : ''); } };
  if (S.demo || !S.token) { setMsg('Changing your password needs a real account — you are browsing the demo.', true); return; }
  var cur = $('chpw-current').value;
  var next = $('chpw-new').value;
  if (!cur || !next) { setMsg('Enter your current password and a new password.', true); return; }
  if (next.length < 8) { setMsg('New password must be at least 8 characters.', true); return; }
  setMsg('Updating…');
  api('/v1/me/change-password', { method: 'POST', body: { currentPassword: cur, newPassword: next } }).then(function () {
    $('chpw-current').value = ''; $('chpw-new').value = '';
    setMsg('Password changed. Other signed-in devices were signed out.');
  }).catch(function (e) { setMsg(localizedError(e), true); });
}
function authMsg(text, isError) {
  var m = $('auth-msg');
  m.textContent = text || '';
  m.className = 'form-msg' + (isError ? ' error' : '');
}
function enterApp(needsOnboarding) {
  showScreen('screen-main');
  showPanel('home');
  refreshCreditsPill();
  loadFeed();
  loadRooms();
  loadLive();
  loadCreatorLevels();
  loadCompetitions();
  refreshProfile();
  loadNotifications();
  rtStart();
  if (needsOnboarding) { renderInterestChips(); showScreen('screen-onboarding'); }
}
/* The creator rules come from the server (generated from its config)
 * whenever we have a real account; the mirrored table is only the
 * demo/offline fallback, so the explainer can never drift. */
function loadCreatorLevels() {
  if (S.demo || !S.token) { S.levelsInfo = null; return; }
  api('/v1/creator-levels').then(function (r) {
    S.levelsInfo = r.data;
  }).catch(function () { /* keep the mirrored fallback */ });
}
function submitAuth() {
  var email = $('auth-email').value.trim();
  var password = $('auth-password').value;
  if (!email || !password) { authMsg(t('emailPasswordRequired'), true); return; }
  var btn = $('auth-submit');
  btn.disabled = true;
  authMsg('');
  if (authMode === 'register') {
    /* Bug fix (QA #16): sign-up had no age gate at all while every
     * page rates LOOPI 18+. The confirmation is required to register. */
    var ageBox = $('auth-age');
    if (ageBox && !ageBox.checked) {
      authMsg('Please confirm you are 18 or older — LOOPI is an 18+ app.', true);
      btn.disabled = false;
      return;
    }
    var body = {
      email: email, password: password,
      displayName: $('auth-name').value.trim() || undefined,
      handle: $('auth-handle').value.trim() || undefined,
      /* Bug fix (QA #14): the creators page promises new users can
       * name who brought them; the server stores it as referredById. */
      referredBy: $('auth-referrer') ? ($('auth-referrer').value.trim().replace(/^@/, '') || undefined) : undefined,
      ageConfirmed: true,
      interests: S.pickedInterests
    };
    api('/v1/register', { method: 'POST', body: body }).then(function (r) {
      btn.disabled = false;
      saveToken(r.data.token);
      S.user = r.data.user; S.demo = false;
      enterApp(true);
    }).catch(function (e) {
      btn.disabled = false;
      if (e.status === 0) authMsg(t('serverUnreachableAuth'), true);
      else authMsg(localizedError(e), true);
    });
  } else {
    api('/v1/login', { method: 'POST', body: { email: email, password: password } }).then(function (r) {
      btn.disabled = false;
      saveToken(r.data.token);
      S.user = r.data.user; S.demo = false;
      /* Bug fix (QA #7): onboarding re-appeared on EVERY sign-in for
       * anyone who skipped it (their interests stay empty forever).
       * Remember completion/skip per account on this device. */
      enterApp(!(r.data.user.interests && r.data.user.interests.length) && !onboardDone());
    }).catch(function (e) {
      btn.disabled = false;
      if (e.status === 0) authMsg(t('serverUnreachableAuth'), true);
      else authMsg(localizedError(e), true);
    });
  }
}
function browseDemo() {
  S.demo = true;
  S.user = { id: 'demo_me', handle: 'you.demo', displayName: t('youDemoName'), creatorLevel: 2, xp: 80, interests: ['food', 'comedy'],
    bio: 'Building in public — one short a day 🎬', followersCount: 128, followingCount: 86,
    badges: [{ id: 'first_upload', name: 'First Upload', icon: '🎬' }, { id: 'level_2', name: 'Rising', icon: '⬆' }],
    streak: { lastDay: null, current: 3, longest: 6 }, totalLikes: 42 };
  S.myProfile = null;
  S.earnings = { balance: 12, history: [] };
  saveToken(null);
  enterApp(false);
}
function logout() {
  var done = function () {
    /* Logging out clears BOTH stored forms of the session: the
     * localStorage token and any Keystore-sealed biometric copy. */
    var b = bioBridge();
    if (b && b.disable) { try { b.disable(); } catch (e) { /* ignore */ } }
    /* Bug fix (QA #8): the auth form kept the previous account's
     * email and masked password after sign-out. Clear every field. */
    ['auth-email', 'auth-password', 'auth-name', 'auth-handle', 'auth-referrer'].forEach(function (id) {
      var n = $(id); if (n) n.value = '';
    });
    var ageBox = $('auth-age'); if (ageBox) ageBox.checked = false;
    authMsg('');
    saveToken(null); S.user = null; S.demo = false;
    rtStop();
    S.myProfile = null;
    S.feed = []; S.rooms = []; S.roomUnread = {}; S.chatSeen = {};
    showScreen('screen-auth');
    paintBioUnlockButton();
  };
  if (S.token) api('/v1/logout', { method: 'POST' }).then(done, done);
  else done();
}

/* ---------------- account deletion (Settings danger zone) ----------------
 * DELETE /v1/me with the account password re-entered. The server
 * answers 403 PASSWORD_CONFIRMATION_FAILED and deletes NOTHING on a
 * wrong password; on 200 the account (and every session, including
 * this one) is gone, so we clear local state and land on auth. */
function openDeleteAccount() {
  if (S.demo || !S.token) { toast(t('deleteNeedsAccount')); return; }
  $('delete-password').value = '';
  var m = $('delete-msg'); m.textContent = ''; m.className = 'form-msg';
  show($('delete-sheet'));
  updateBottomBar();
  $('delete-password').focus();
}
function closeDeleteAccount() {
  $('delete-password').value = '';
  hide($('delete-sheet'));
  updateBottomBar();
}
function submitDeleteAccount() {
  var pw = $('delete-password').value;
  var msg = $('delete-msg');
  if (!pw) { msg.textContent = t('deletePasswordRequired'); msg.className = 'form-msg error'; return; }
  var btn = $('delete-confirm');
  btn.disabled = true;
  api('/v1/me', { method: 'DELETE', body: { password: pw } }).then(function () {
    btn.disabled = false;
    closeDeleteAccount();
    var bioB = bioBridge();
    if (bioB && bioB.disable) { try { bioB.disable(); } catch (e) { /* ignore */ } }
    saveToken(null); S.user = null; S.demo = false;
    S.feed = []; S.rooms = []; S.liveRooms = [];
    showScreen('screen-auth');
    authMsg(t('accountDeleted'));
  }).catch(function (e) {
    btn.disabled = false;
    /* 403 → localizedError maps PASSWORD_CONFIRMATION_FAILED to the
     * localized wrong-password string; nothing was deleted. */
    msg.textContent = localizedError(e);
    msg.className = 'form-msg error';
  });
}

/* ---------------- onboarding ---------------- */
function renderInterestChips() {
  var wrap = $('interest-chips');
  if (!wrap) return;
  wrap.innerHTML = '';
  INTERESTS.forEach(function (id) {
    var chip = el('button', 'chip' + (S.pickedInterests.indexOf(id) >= 0 ? ' on' : ''), t('interest_' + id));
    chip.addEventListener('click', function () {
      var i = S.pickedInterests.indexOf(id);
      if (i >= 0) S.pickedInterests.splice(i, 1); else S.pickedInterests.push(id);
      renderInterestChips();
    });
    wrap.appendChild(chip);
  });
}
function onboardDone() {
  try { return localStorage.getItem('loopi_onboard_done_' + (S.user ? S.user.id : 'anon')) === '1'; }
  catch (e) { return false; }
}
function markOnboardDone() {
  try { localStorage.setItem('loopi_onboard_done_' + (S.user ? S.user.id : 'anon'), '1'); } catch (e) { /* ignore */ }
}
function finishOnboarding() {
  var done = function () { markOnboardDone(); showScreen('screen-main'); showPanel('home'); loadFeed(); };
  if (!S.demo && S.token) {
    api('/v1/me', { method: 'PATCH', body: { interests: S.pickedInterests } })
      .then(function (r) { S.user = r.data.user; done(); })
      .catch(function () { $('onboard-msg').textContent = t('onboardSaveFailed'); done(); });
  } else done();
}

/* ---------------- feed ---------------- */
function levelTagOf(owner) {
  if (!owner) return '';
  var lv = owner.creatorLevel || 1;
  var name = owner.levelName || levelForLevel(lv).name;
  return 'L' + lv + ' · ' + name;
}
var demoToastShown = false;
function noteDemoOnce() {
  if (demoToastShown) return;
  demoToastShown = true;
  toast(t('demoBanner'));
}
/* ---------------- real-time (SSE /v1/events) ----------------
 * Kay 2026-11-14: "full online thing" — a post must reach other
 * online users in under 5 seconds. The server pushes lightweight
 * id-only events (src/events.js); we refetch content through the
 * normal REST endpoints, so every privacy rule still applies.
 * While the stream is down the app behaves exactly as it did
 * before it existed (content loads on navigation), and every
 * reconnect runs a catch-up that counts what was missed and
 * surfaces it through the same "new posts" pill — nothing is
 * silently dropped and the scroll position is never yanked. */
var RT = { es: null, timer: null, backoffMs: 1000, newPosts: 0, connected: false, dropped: false };
function rtStart() {
  if (S.demo || !S.token) return;
  if (typeof EventSource === 'undefined') return;
  if (RT.es || RT.timer) return;
  rtConnect();
}
function rtStop() {
  if (RT.timer) { clearTimeout(RT.timer); RT.timer = null; }
  if (RT.es) { try { RT.es.close(); } catch (e) { /* ignore */ } RT.es = null; }
  RT.connected = false; RT.dropped = false; RT.newPosts = 0; RT.backoffMs = 1000;
  rtPaintPill();
}
function rtScheduleReconnect() {
  if (RT.timer || S.demo || !S.token) return;
  var wait = RT.backoffMs;
  RT.backoffMs = Math.min(30000, RT.backoffMs * 2);
  RT.timer = setTimeout(function () { RT.timer = null; rtConnect(); }, wait);
}
function rtConnect() {
  if (S.demo || !S.token || typeof EventSource === 'undefined') return;
  if (RT.es) return;
  var es;
  try {
    es = new EventSource(CONFIG.apiBase + '/v1/events?token=' + encodeURIComponent(S.token));
  } catch (e) { rtScheduleReconnect(); return; }
  RT.es = es;
  es.onopen = function () {
    if (RT.es !== es) return;
    RT.connected = true;
    RT.backoffMs = 1000;
    if (RT.dropped) { RT.dropped = false; rtCatchUp(); }
  };
  es.onerror = function () {
    if (RT.es !== es) return;
    /* Drop and rebuild by hand (instead of EventSource's built-in
     * silent retry) so a rotated session token is re-read from
     * S.token on reconnect and logout really stops the stream. */
    RT.connected = false;
    RT.dropped = true;
    try { es.close(); } catch (e) { /* ignore */ }
    RT.es = null;
    rtScheduleReconnect();
  };
  es.addEventListener('video:new', function (ev) { rtOnVideoNew(rtParse(ev)); });
  es.addEventListener('video:engagement', function (ev) { rtOnEngagement(rtParse(ev)); });
  es.addEventListener('message:new', function (ev) { rtOnMessageNew(rtParse(ev)); });
  es.addEventListener('room:activity', function (ev) { rtOnRoomActivity(rtParse(ev)); });
}
function rtParse(ev) {
  try { return JSON.parse(ev.data || '{}'); } catch (e) { return null; }
}
function rtCatchUp() {
  loadRooms();
  if (S.currentRoom && S.currentPanel === 'chat') rtAppendNewMessages();
  if (S.demo || !S.token) return;
  api('/v1/feed').then(function (r) {
    var known = {};
    S.feed.forEach(function (v) { known[v.id] = 1; });
    var fresh = 0;
    (r.data.videos || []).forEach(function (v) {
      if (!known[v.id] && !(S.user && v.owner && v.owner.id === S.user.id)) fresh++;
    });
    if (fresh > 0) { RT.newPosts += fresh; rtPaintPill(); }
  }).catch(function () { /* the pill simply stays as it was */ });
}
function rtPaintPill() {
  var pill = $('new-posts-pill');
  if (!pill) return;
  if (RT.newPosts > 0) {
    pill.textContent = t('newPostsPill').replace('{count}', String(RT.newPosts));
    show(pill);
  } else hide(pill);
}
function rtShowPendingPosts() {
  RT.newPosts = 0;
  rtPaintPill();
  loadFeed();
  var feed = $('feed');
  if (feed) feed.scrollTop = 0;
}
function rtOnVideoNew(d) {
  if (!d || !d.videoId) return;
  if (S.user && d.authorHandle && d.authorHandle === S.user.handle) return;
  if (findVideo(d.videoId)) return;
  RT.newPosts += 1;
  rtPaintPill();
}
function rtOnEngagement(d) {
  if (!d || !d.videoId) return;
  var item = null;
  for (var i = 0; i < S.feed.length; i++) if (S.feed[i].id === d.videoId) { item = S.feed[i]; break; }
  if (!item) return;
  api('/v1/videos/' + encodeURIComponent(d.videoId)).then(function (r) {
    var v = r.data.video;
    if (!v) return;
    item.likeCount = v.likeCount;
    item.commentCount = v.commentCount;
    var card = document.querySelector('#feed .video-card[data-video-id="' + d.videoId + '"]');
    if (!card) return;
    var heart = card.querySelector('.rail-btn.heart .rail-label');
    if (heart) heart.textContent = fmtCount(item.likeCount);
    var comment = card.querySelector('.rail-btn.comment .rail-label');
    if (comment) comment.textContent = item.commentCount >= 10000 ? fmtCount(item.commentCount) : Number(item.commentCount).toLocaleString('en-US');
  }).catch(function () { /* counts refresh on the next feed load */ });
}
function rtOnMessageNew(d) {
  if (!d || !d.roomId) return;
  if (S.currentRoom && S.currentRoom.id === d.roomId && S.currentPanel === 'chat') {
    rtAppendNewMessages();
    return;
  }
  S.roomUnread[d.roomId] = (S.roomUnread[d.roomId] || 0) + 1;
  renderRooms();
}
function rtOnRoomActivity(d) {
  if (!d || !d.roomId) return;
  loadRooms();
  if (S.currentRoom && S.currentRoom.id === d.roomId && S.currentPanel === 'chat') {
    rtAppendNewMessages();
  }
}
function rtAppendNewMessages() {
  var room = S.currentRoom;
  if (!room || room.demo || S.demo || !S.token) return;
  api('/v1/rooms/' + room.id + '/messages').then(function (r) {
    if (!S.currentRoom || S.currentRoom.id !== room.id) return;
    var wrap = $('chat-messages');
    var nearBottom = wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight < 140;
    var fresh = [];
    (r.data.messages || []).forEach(function (m) {
      if (S.chatSeen[m.id]) return;
      S.chatSeen[m.id] = 1;
      fresh.push(m);
      wrap.appendChild(messageNode(m));
    });
    if (fresh.length) {
      armVoiceTranscriptPoll(fresh);
      if (nearBottom) wrap.scrollTop = wrap.scrollHeight;
    }
  }).catch(function () { /* the next navigation reloads the room */ });
}
function loadFeed() {
  if (S.demo || !S.token) {
    S.feed = DEMO_FEED.slice();
    renderFeed();
    noteDemoOnce();
    return;
  }
  var following = S.feedTab === 'following';
  api(following ? '/v1/feed?tab=following' : '/v1/feed').then(function (r) {
    var vids = r.data.videos || [];
    /* Bug fix (QA #10): the same underlying media seeded as several
     * posts read as one video repeated over and over. Collapse exact
     * duplicates (same media URL) so each video appears once. */
    var seenMedia = {};
    S.feed = vids.filter(function (v) {
      var k = v.sourceUrl || v.id;
      if (seenMedia[k]) return false;
      seenMedia[k] = 1;
      return true;
    });
    if (!S.feed.length && !following) {
      S.feed = DEMO_FEED.slice();
      noteDemoOnce();
    }
    renderFeed();
  }).catch(function () {
    if (following) { S.feed = []; renderFeed(); return; }
    S.feed = DEMO_FEED.slice();
    noteDemoOnce();
    renderFeed();
  });
}
function posterSrc(item) {
  if (window.LOOPI_POSTERS && item && window.LOOPI_POSTERS[item.id]) return window.LOOPI_POSTERS[item.id];
  return null;
}
function clipSrc(item) {
  if (item && item.clip && window.LOOPI_CLIPS && window.LOOPI_CLIPS[item.clip]) return window.LOOPI_CLIPS[item.clip];
  return null;
}
/* A server-stored upload's sourceUrl is an API-relative media path
 * (/v1/media/<id>) — resolve it against the API origin so playback
 * works from the static preview host too. Absolute URLs (fal
 * results) and blob:/data: URLs pass through untouched. */
function mediaSrc(src) {
  if (src && src.charAt(0) === '/') return CONFIG.apiBase + src;
  return src;
}
function posterFor(item) {
  var d = el('div', 'poster');
  var src = posterSrc(item);
  if (src) {
    var img = document.createElement('img');
    img.src = src; img.alt = ''; img.className = 'poster-img';
    d.appendChild(img);
    return d;
  }
  d.style.background = gradientFor(item.owner ? item.owner.handle : item.id);
  var pe = el('span', 'poster-emoji'); pe.innerHTML = LOOPI_ICONS.svg('play', 'ic poster-play'); d.appendChild(pe);
  return d;
}
/* Poster fallback glyph: a modern play mark (icons.js), never an
 * emoji — the per-video demo emoji map was retired in the 2030 pass. */
function renderFeed() {
  var feed = $('feed');
  feed.innerHTML = '';
  var items = S.feed;
  if (S.feedTab === 'following' && S.demo) {
    var fol = items.filter(function (v) {
      return v.owner && DEMO_FOLLOWING.indexOf(v.owner.handle) >= 0;
    });
    if (fol.length) items = fol;
  }
  if (!items.length) {
    feed.appendChild(el('p', 'sub', S.feedTab === 'following'
      ? 'Nothing here yet — follow some creators and their newest videos will land in this tab.'
      : 'Nothing here yet.'));
  }
  /* Bug fix (QA #9): the placeholder "AD SLOT" cards are gone — there
   * is no ad backend behind them, and they read as broken content.
   * Real ads can return when there is a real ad system to serve. */
  items.forEach(function (item) {
    feed.appendChild(videoCard(item));
  });
  observeVideos();
  buildExploreGrid();
}
function videoCard(item) {
  var card = el('article', 'video-card');
  card.setAttribute('data-video-id', item.id);
  var src = clipSrc(item) || mediaSrc(item.sourceUrl);
  var vid = null;
  if (src && (/\.(mp4|webm|mov)(\?|$)/i.test(src) || item.clip ||
      (item.sourceUrl && item.sourceUrl.indexOf('/v1/media/') >= 0))) {
    vid = document.createElement('video');
    vid.src = src; vid.muted = true; vid.loop = true; vid.playsInline = true;
    vid.setAttribute('playsinline', '');
    vid.setAttribute('preload', 'metadata');
    var ps = posterSrc(item);
    if (ps) vid.setAttribute('poster', ps);
    card.appendChild(vid);
    /* motion first: play immediately; the observer pauses off-screen
     * videos. Tap the video to pause / resume. */
    var pp = vid.play(); if (pp) pp.catch(function () {});
    vid.addEventListener('click', function () {
      if (vid.paused) { var p = vid.play(); if (p) p.catch(function () {}); }
      else vid.pause();
    });
  } else {
    card.appendChild(posterFor(item));
  }
  card.appendChild(el('div', 'card-shade'));

  /* creator block — bottom-left, the sample's exact stack:
   * @handle + kind chip + gold level chip, caption, hashtags,
   * glass info chip (when present), AI prompt chip, music line. */
  var meta = el('div', 'card-meta');
  var authorRow = el('div', 'author-row');
  var anEl = el('span', 'author-name', '@' + (item.owner ? item.owner.handle : 'unknown'));
  anEl.addEventListener('click', function () { openCreator(item.owner); });
  authorRow.appendChild(anEl);
  if (item.kind === 'ai') authorRow.appendChild(el('span', 'aibadge', '✦ AI'));
  else authorRow.appendChild(el('span', 'filmed-chip', t('filmed')));
  var lt = levelTagOf(item.owner);
  if (lt) authorRow.appendChild(el('span', 'level-tag', lt));
  meta.appendChild(authorRow);
  if (item.caption) meta.appendChild(el('p', 'caption', item.caption));
  if (item.hashtags && item.hashtags.length) {
    meta.appendChild(el('div', 'hashtags', item.hashtags.map(function (h) { return '#' + h; }).join(' ')));
  }
  if (item.info) { var icp = el('div', 'info-chip'); icp.innerHTML = LOOPI_ICONS.svg('pin', 'ic ic-inline'); icp.appendChild(document.createTextNode(' ' + item.info)); meta.appendChild(icp); }
  if (item.kind === 'ai' && item.prompt) {
    var chip = el('button', 'prompt-chip');
    chip.appendChild(el('span', null, '✦'));
    chip.appendChild(el('span', null, '"' + item.prompt + '"'));
    chip.addEventListener('click', function () { openCreate(item.prompt); });
    meta.appendChild(chip);
  }
  var musicLabel = (item.music && item.music.title)
    ? item.music.title + ' · ' + item.music.artist
    : t('originalSound') + ' · ' + (item.owner ? item.owner.handle : 'loopi');
  meta.appendChild(el('div', 'musicline', '♪ ' + musicLabel));
  card.appendChild(meta);

  /* right rail — author avatar on top, dark-glass actions, lime Remix */
  var rail = el('div', 'rail');
  var rav = el('button', 'rail-avatar', initial(item.owner ? item.owner.displayName : '?'));
  rav.style.background = (item.owner && item.owner.avatarBg) || gradientFor(item.owner ? item.owner.handle : item.id);
  rav.appendChild(el('span', 'rail-follow', '+'));
  rav.addEventListener('click', function () { openCreator(item.owner); });
  rail.appendChild(rav);
  rail.appendChild(railBtn(LOOPI_ICONS.svg('heart'), fmtCount(item.likeCount), function (btn) { toggleLike(item, btn); }, 'heart'));
  rail.appendChild(railBtn(LOOPI_ICONS.svg('comment'), item.commentCount >= 10000 ? fmtCount(item.commentCount) : Number(item.commentCount).toLocaleString('en-US'), function () { openComments(item); }, 'comment'));
  rail.appendChild(railBtn(LOOPI_ICONS.svg('share'), t('share'), function () { shareVideo(item); }, 'share'));
  rail.appendChild(railBtn(LOOPI_ICONS.svg('repeat'), t('remix'), function () { openCreate(item.prompt || null); }, 'remix'));
  card.appendChild(rail);

  /* thin progress track, acid-lime fill, at the very bottom */
  var prog = el('div', 'card-progress');
  var fill = el('i', null);
  fill.style.width = '38%';
  prog.appendChild(fill);
  card.appendChild(prog);
  if (vid) {
    vid.addEventListener('timeupdate', function () {
      if (vid.duration) fill.style.width = Math.round(100 * vid.currentTime / vid.duration) + '%';
    });
  }
  return card;
}
function railBtn(icon, label, onClick, variant) {
  var b = el('button', 'rail-btn' + (variant ? ' ' + variant : ''));
  var ic = el('span', 'rail-icon');
  ic.innerHTML = icon;
  b.appendChild(ic);
  b.appendChild(el('span', 'rail-label', label));
  b.addEventListener('click', function () { onClick(b); });
  return b;
}
function adCard() {
  var card = el('article', 'video-card ad-card');
  card.appendChild(el('span', 'ad-label', t('adSlot')));
  var adIc = el('div', 'ad-ic'); adIc.innerHTML = LOOPI_ICONS.svg('megaphone'); card.appendChild(adIc);
  card.appendChild(el('p', 'sub', t('adText')));
  return card;
}
var videoObserver = null;
function observeVideos() {
  if (videoObserver) videoObserver.disconnect();
  if (!('IntersectionObserver' in window)) return;
  videoObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target.querySelector('video');
      if (!v) return;
      if (en.intersectionRatio > 0.6) { var p = v.play(); if (p) p.catch(function () {}); }
      else v.pause();
    });
  }, { root: $('feed'), threshold: [0, 0.6, 1] });
  var cards = document.querySelectorAll('#feed .video-card');
  for (var i = 0; i < cards.length; i++) videoObserver.observe(cards[i]);
}
function playVisibleVideo() { /* IntersectionObserver handles playback */ }
function toggleLike(item, btn) {
  if (item.demo || S.demo || !S.token) {
    var liked = btn.classList.toggle('liked');
    item.likeCount += liked ? 1 : -1;
    btn.lastChild.textContent = fmtCount(item.likeCount);
    return;
  }
  api('/v1/videos/' + item.id + '/like', { method: 'POST' }).then(function (r) {
    item.likeCount = r.data.likeCount;
    btn.classList.toggle('liked', !!r.data.liked);
    btn.lastChild.textContent = fmtCount(item.likeCount);
  }).catch(function (e) { toast(localizedError(e)); });
}
function shareVideo(item) {
  var url = item.sourceUrl || ('https://loopi.example/v/' + item.id);
  var text = item.caption || t('shareDefaultText');
  if (navigator.share) {
    navigator.share({ title: 'LOOPI', text: text, url: url }).catch(function () {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function () { toast(t('linkCopied')); });
  } else {
    toast(url);
  }
}

/* ---------------- comments ---------------- */
function openComments(item) {
  S.commentVideo = item;
  show($('comments-sheet'));
  updateBottomBar();
  var list = $('comments-list');
  list.innerHTML = '';
  $('comment-msg').textContent = '';
  var render = function (comments) {
    list.innerHTML = '';
    if (!comments.length) list.appendChild(el('p', 'sub', t('noComments')));
    comments.forEach(function (c) {
      var row = el('div', 'comment-row');
      row.appendChild(el('span', 'mini-avatar', initial(c.user ? c.user.displayName : '?')));
      var body = el('div');
      body.appendChild(el('div', 'c-who', '@' + (c.user ? c.user.handle : 'unknown')));
      body.appendChild(el('div', 'c-text', c.text));
      row.appendChild(body);
      list.appendChild(row);
    });
  };
  if (item.demo || S.demo || !S.token) {
    render(DEMO_COMMENTS.map(function (c) { return { user: { displayName: c.who, handle: c.who }, text: c.text }; }));
    return;
  }
  api('/v1/videos/' + item.id + '/comments').then(function (r) { render(r.data.comments || []); })
    .catch(function (e) { $('comment-msg').textContent = localizedError(e); });
}
function sendComment() {
  var item = S.commentVideo;
  var text = $('comment-input').value.trim();
  if (!item || !text) return;
  if (item.demo || S.demo || !S.token) {
    var list = $('comments-list');
    var row = el('div', 'comment-row');
    row.appendChild(el('span', 'mini-avatar', initial(S.user ? S.user.displayName : 'Y')));
    var body = el('div');
    body.appendChild(el('div', 'c-who', '@' + (S.user ? S.user.handle : 'you')));
    body.appendChild(el('div', 'c-text', text));
    row.appendChild(body);
    list.appendChild(row);
    $('comment-input').value = '';
    return;
  }
  api('/v1/videos/' + item.id + '/comments', { method: 'POST', body: { text: text } }).then(function () {
    $('comment-input').value = '';
    item.commentCount += 1;
    openComments(item);
  }).catch(function (e) { $('comment-msg').textContent = localizedError(e); });
}

/* ---------------- floating chat bubble + overlay ---------------- */
function maybeShowBubble() {
  if (S.overlaySeen) return;
  var panel = $('panel-home');
  if (!panel || panel.classList.contains('hidden')) return;
  setTimeout(function () {
    if (S.overlaySeen) return;
    if ($('panel-home').classList.contains('hidden')) return;
    $('chat-bubble-avatar').textContent = initial('Mira');
    show($('chat-bubble'));
    var b2 = $('chat-bubble-2');
    if (b2 && S.demo) show(b2);
    var mb = $('menu-chat-badge');
    if (mb && S.demo) show(mb);
  }, 5000);
}
function openOverlay() {
  S.overlayOpen = true;
  S.overlaySeen = true;
  hide($('chat-bubble'));
  show($('chat-overlay'));
  renderOverlayMessages();
  updateBottomBar();
}
function closeOverlay() {
  S.overlayOpen = false;
  hide($('chat-overlay'));
  updateBottomBar();
}
function renderOverlayMessages() {
  var wrap = $('overlay-messages');
  wrap.innerHTML = '';
  DEMO_MESSAGES.demo_room_dm.forEach(function (m) {
    wrap.appendChild(messageNode(m));
  });
  wrap.scrollTop = wrap.scrollHeight;
}
function sendOverlayMessage() {
  var input = $('overlay-input');
  var text = input.value.trim();
  if (!text) return;
  input.value = '';
  var msg = { id: 'local_' + Date.now(), sender: S.user, type: 'text', text: text, mine: true };
  $('overlay-messages').appendChild(messageNode(msg));
  $('overlay-messages').scrollTop = $('overlay-messages').scrollHeight;
  // Demo thread: Mira answers on-device so the overlay feels alive.
  setTimeout(function () {
    if (!S.overlayOpen) return;
    var reply = { id: 'local_r' + Date.now(), sender: DEMO_CREATORS.mira, type: 'text', text: 'omg yes 😂 send it to the group chat too', mine: false };
    $('overlay-messages').appendChild(messageNode(reply));
    $('overlay-messages').scrollTop = $('overlay-messages').scrollHeight;
  }, 1400);
}

/* ---------------- discover / explore grid ---------------- */
function buildExploreGrid() {
  var grid = $('explore-grid');
  if (!grid) return;
  var q = ($('search-input').value || '').toLowerCase();
  var mine = S.user ? S.user.id : null;
  // Explore = squares from creators you do NOT follow (here: not you,
  // and not the authors already in your Home feed's first positions —
  // the demo catalog doubles as the non-followed pool).
  var pool = DEMO_FEED.filter(function (v) { return v.owner.id !== mine; });
  if (!S.demo && S.feed.length) {
    var seen = {};
    S.feed.concat(pool).forEach(function (v) { if (v.owner && v.owner.id !== mine) seen[v.id] = v; });
    pool = Object.keys(seen).map(function (k) { return seen[k]; });
  }
  if (q) {
    pool = pool.filter(function (v) {
      var hay = ((v.caption || '') + ' ' + (v.hashtags || []).join(' ') + ' ' +
        (v.owner ? v.owner.handle + ' ' + v.owner.displayName : '') + ' ' + (v.prompt || '')).toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  grid.innerHTML = '';
  if (!pool.length) grid.appendChild(el('p', 'sub', t('nothingMatches')));
  pool.forEach(function (v) {
    var sq = el('div', 'square');
    var cs = clipSrc(v) || mediaSrc(v.sourceUrl);
    if (cs) {
      var sv = document.createElement('video');
      sv.src = cs; sv.muted = true; sv.loop = true; sv.playsInline = true;
      sv.setAttribute('playsinline', ''); sv.setAttribute('preload', 'metadata');
      /* Bug fix (QA #11): tiles never used the server posterUrl (only
       * a local demo poster map), so any tile whose video could not
       * load rendered as a blank peach square. Use the real poster;
       * also stop auto-playing every tile in the grid. */
      var sp = posterSrc(v) || (v.posterUrl ? mediaSrc(v.posterUrl) : null);
      if (sp) sv.setAttribute('poster', sp);
      sq.appendChild(sv);
    } else {
      sq.style.background = gradientFor(v.owner ? v.owner.handle : v.id);
      sq.appendChild(el('span', null, posterEmoji(v)));
    }
    if (v.kind === 'ai') { var b = el('span', 'sq-ai kind-badge', '✦ AI'); sq.appendChild(b); }
    var meta = el('div', 'sq-meta');
    meta.appendChild(el('span', null, '@' + (v.owner ? v.owner.handle : '')));
    /* Was: likeCount * 7 displayed as a view count — a fabricated
     * number. Show the real view count when the server provides one. */
    if (typeof v.viewCount === 'number') meta.appendChild(el('span', null, '▶ ' + fmtCount(v.viewCount)));
    sq.appendChild(meta);
    sq.addEventListener('click', function () { jumpToVideo(v); });
    grid.appendChild(sq);
  });
}
function jumpToVideo(video) {
  // Open the immersive feed starting at this video: if it's not in the
  // current feed, put it first, then show Home scrolled to it.
  var idx = -1;
  for (var i = 0; i < S.feed.length; i++) if (S.feed[i].id === video.id) idx = i;
  if (idx < 0) {
    S.feed = [video].concat(S.feed);
    renderFeed();
    idx = 0;
  }
  showPanel('home');
  var cards = document.querySelectorAll('#feed .video-card');
  // cards include ad slots; find the one carrying this video id
  for (var j = 0; j < cards.length; j++) {
    if (cards[j].getAttribute('data-video-id') === video.id) {
      cards[j].scrollIntoView({ block: 'start' });
      break;
    }
  }
}

/* ---------------- weekly competition (Discover card) ----------------
 * Driven by GET /v1/competitions/current (+ /past) on real accounts.
 * The engine is gated server-side (opens at 500 registered users);
 * below the gate the card shows the dormant state with the live
 * count — it is never hidden. Entries are the user's OWN AI videos:
 * picking one posts it as this week's entry (one per week); with no
 * AI video yet, the CTA routes to Create with the prompt prefilled. */
function fmtCountdown(ms) {
  if (!(ms > 0)) return '0m';
  var m = Math.floor(ms / 60000);
  var d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  if (d > 0) return d + 'd ' + h + 'h';
  if (h > 0) return h + 'h ' + mm + 'm';
  return mm + 'm';
}
function myAiVideos() {
  if (S.demo) return DEMO_COMP_MY_VIDEOS;
  var mine = S.user ? S.user.id : null;
  var seen = {}, out = [];
  S.feed.forEach(function (v) {
    if (v.kind === 'ai' && v.owner && v.owner.id === mine && !seen[v.id]) {
      seen[v.id] = 1; out.push(v);
    }
  });
  return out;
}
function loadCompetitions() {
  if (S.demo || !S.token) {
    S.comp = DEMO_COMP; S.compPast = DEMO_COMP_PAST;
    renderCompetition();
    return;
  }
  api('/v1/competitions/current').then(function (r) {
    S.comp = r.data; renderCompetition();
  }).catch(function () { /* server unreachable: the card stays hidden */ });
  api('/v1/competitions/past').then(function (r) {
    S.compPast = (r.data && r.data.past) || []; renderCompetition();
  }).catch(function () { /* same */ });
}
function compEnter(videoId) {
  if (S.demo || !S.token) { toast(t('compDemoNote')); return; }
  api('/v1/competitions/enter', { method: 'POST', body: { videoId: videoId } }).then(function () {
    toast(t('compEnteredToast'));
    loadCompetitions();
  }).catch(function (e) { toast(localizedError(e)); });
}
function renderCompetition() {
  var card = $('comp-card'), body = $('comp-body');
  if (!card || !body) return;
  var c = S.comp;
  if (!c) { hide(card); return; }
  show(card);
  body.innerHTML = '';
  var cp = el('p', 'comp-prompt'); cp.innerHTML = LOOPI_ICONS.svg('target', 'ic ic-inline'); cp.appendChild(document.createTextNode(' ' + t('compThisWeek') + ': "' + (c.prompt || '') + '"')); body.appendChild(cp);
  body.appendChild(el('p', 'sub', t('compPrize').replace('{n}', c.prizeCredits)));
  if (!c.active) {
    /* Dormant: the gate is the story — say it plainly, with the
     * live count and a progress bar, exactly like the server sees it. */
    body.appendChild(el('p', 'comp-dormant',
      t('compDormant').replace('{min}', c.minUsers).replace('{n}', c.totalUsers)));
    var bar = el('div', 'comp-bar');
    var fill = el('div', 'comp-bar-fill');
    fill.style.width = Math.min(100, Math.round(100 * c.totalUsers / Math.max(1, c.minUsers))) + '%';
    bar.appendChild(fill);
    body.appendChild(bar);
    body.appendChild(el('p', 'sub',
      t('compProgress').replace('{n}', c.totalUsers).replace('{min}', c.minUsers)));
    if (S.demo) body.appendChild(el('p', 'sub', t('compDemoNote')));
  } else if (c.results) {
    var r = c.results;
    var cw = el('p', 'comp-winner'); cw.innerHTML = LOOPI_ICONS.svg('trophy', 'ic ic-inline gold-ic'); cw.appendChild(document.createTextNode(' ' + t('compWinner') + ': ' + (r.winner ? '@' + r.winner.handle : '—') + ' — ' + t('compWonWith').replace('{n}', r.likes) + ' · ✦ ' + r.prizeCredits)); body.appendChild(cw);
  } else {
    body.appendChild(el('p', 'sub',
      (c.entries === 1 ? t('compEntriesOne') : t('compEntries').replace('{n}', c.entries)) +
      ' · ' + t('compEndsIn').replace('{t}', fmtCountdown(c.endsAt - Date.now()))));
    if (c.myEntry) {
      var ce = el('p', 'comp-entered'); ce.innerHTML = LOOPI_ICONS.svg('check', 'ic ic-inline'); ce.appendChild(document.createTextNode(' ' + t('compYourEntry'))); body.appendChild(ce);
    } else {
      var mine = myAiVideos();
      if (mine.length) {
        body.appendChild(el('p', 'sub', t('compPickYours')));
        mine.forEach(function (v) {
          var row = el('div', 'comp-pick-row');
          var label = el('span', 'comp-pick-label',
            '✦ ' + (v.caption || v.prompt || '') + ' · ' + fmtCount(v.likeCount || 0) + ' ' + t('compLikesWord'));
          var btn = el('button', 'primary comp-enter-btn', t('compEnter'));
          (function (vid) {
            btn.addEventListener('click', function () { compEnter(vid); });
          })(v.id);
          row.appendChild(label);
          row.appendChild(btn);
          body.appendChild(row);
        });
      } else {
        body.appendChild(el('p', 'sub', t('compNoAiVideos')));
        var cta = el('button', 'primary', t('compGenerateCta'));
        cta.addEventListener('click', function () { openCreate(c.prompt); });
        body.appendChild(cta);
      }
    }
  }
  /* Past winners live under the current-week state, whichever it is. */
  if (Array.isArray(S.compPast)) {
    body.appendChild(el('h4', 'comp-past-title', t('compPastWinners')));
    if (!S.compPast.length) {
      body.appendChild(el('p', 'sub', t('compNoWinnersYet')));
    } else {
      S.compPast.forEach(function (p) {
        var pr = el('p', 'comp-past-row'); pr.innerHTML = LOOPI_ICONS.svg('trophy', 'ic ic-inline gold-ic'); pr.appendChild(document.createTextNode(' ' + (p.winner ? '@' + p.winner.handle : '—') + ' · "' + (p.prompt || '') + '" · ' + p.likes + ' ' + t('compLikesWord') + ' · ✦ ' + p.prizeCredits + ' · ' + p.weekId)); body.appendChild(pr);
      });
    }
  }
}

/* ---------------- create ---------------- */
function openCreate(prefillPrompt) {
  show($('create-panel'));
  if (prefillPrompt) $('gen-prompt').value = prefillPrompt;
  updateGenBalance();
  updateBottomBar();
}
function closeCreate() { closeMusicSheet(); hide($('create-panel')); closeCreditsPopup(); updateBottomBar(); }
function updateGenBalance() {
  $('gen-balance').textContent = '✦ ' + (S.credits ? S.credits.balance : 0);
}
/* A picked file waiting to be posted: {file, durationSec, caption,
 * busy}. Set by handleUploadFile (signed-in accounts only), consumed
 * by submitUpload. */
var pendingUpload = null;
function handleUploadFile() {
  var input = $('upload-file');
  var status = $('upload-status');
  var preview = $('upload-preview');
  var postBtn = $('upload-post-btn');
  status.textContent = ''; status.className = 'form-msg';
  preview.innerHTML = ''; hide(preview);
  hide(postBtn); hide($('upload-progress')); hide($('upload-music-row'));
  pendingUpload = null;
  if (!input.files || !input.files.length) return;
  var file = input.files[0];
  var url = URL.createObjectURL(file);
  var probe = document.createElement('video');
  probe.preload = 'metadata';
  probe.src = url;
  probe.onloadedmetadata = function () {
    var dur = probe.duration || 0;
    if (dur > 20.5) {
      status.textContent = t('uploadTooLong').replace('{s}', Math.round(dur));
      status.classList.add('error');
      URL.revokeObjectURL(url);
      return;
    }
    var v = document.createElement('video');
    v.src = url; v.controls = true; v.playsInline = true;
    preview.appendChild(v);
    show(preview);
    var captionGuess = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
    if (!$('upload-caption').value) $('upload-caption').value = captionGuess;
    if (S.demo || !S.token) {
      /* Signed out / demo: the preview is device-local only, and the
       * status line says exactly that — nothing pretends to post. */
      status.textContent = t('uploadLooksGood').replace('{s}', Math.round(dur)) + ' ' + t('uploadLocalOnly');
      status.classList.add('ok');
      var mine = {
        id: 'local_' + Date.now(), demo: true, local: true, kind: 'upload', sourceUrl: null,
        localUrl: url, durationSec: Math.round(dur), caption: captionGuess,
        hashtags: ['mine'], likeCount: 0, commentCount: 0,
        owner: { id: S.user ? S.user.id : 'me', handle: S.user ? S.user.handle : 'you', displayName: S.user ? S.user.displayName : 'You', creatorLevel: S.user ? S.user.creatorLevel : 1, levelName: levelForLevel(S.user ? S.user.creatorLevel : 1).name }
      };
      S.feed = [mine].concat(S.feed);
      renderFeed();
      return;
    }
    /* Signed in: stage it for a REAL upload (submitUpload). Nothing
     * is shown in the feed until the server has the file. */
    pendingUpload = { file: file, durationSec: Math.max(1, Math.round(dur)), caption: captionGuess, busy: false };
    status.textContent = t('uploadLooksGood').replace('{s}', Math.round(dur)) + ' ' + t('uploadReadyPost');
    status.classList.add('ok');
    postBtn.disabled = false;
    show(postBtn);
    /* "Add a song" row appears with the Post button (signed-in
     * uploads only — the song is mixed server-side). */
    renderMusicRow();
    show($('upload-music-row'));
  };
  probe.onerror = function () {
    status.textContent = t('uploadNotVideo');
    status.classList.add('error');
  };
}
/* XHR twin of api() for moving the file itself: fetch() cannot
 * report upload progress, and the byte transfer is the slow part
 * the user is watching. Resolves with the parsed JSON body. */
function xhrUpload(method, url, file, headers, onProgress) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    Object.keys(headers || {}).forEach(function (k) { xhr.setRequestHeader(k, headers[k]); });
    xhr.upload.onprogress = function (e) {
      if (e.lengthComputable && onProgress) onProgress(Math.round(e.loaded / e.total * 100));
    };
    xhr.onload = function () {
      var data = {};
      try { data = JSON.parse(xhr.responseText || '{}'); } catch (e) { /* non-JSON body */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(xhr.status, data));
    };
    xhr.onerror = function () {
      var e = new ApiError(0, { code: 'OFFLINE' });
      e.message = 'Server unreachable';
      reject(e);
    };
    xhr.send(file);
  });
}
/* Post the staged file for real:
 *   1. POST /v1/uploads reserves the media object and says where
 *      the bytes go (this server, or direct to object storage).
 *   2. The bytes move (progress bar is live throughout).
 *   3. POST /v1/videos registers it — only then does it enter the
 *      feed, as the server's own record (status 'ready', or
 *      'pending' while the safety check runs). Any failure leaves
 *      the file staged so the user can simply tap Post again. */
function submitUpload() {
  if (!pendingUpload || pendingUpload.busy) return;
  var status = $('upload-status');
  var btn = $('upload-post-btn');
  var bar = $('upload-progress');
  var fill = $('upload-progress-bar');
  var caption = ($('upload-caption').value || '').trim() || pendingUpload.caption;
  var staged = pendingUpload;
  staged.busy = true;
  btn.disabled = true;
  status.textContent = ''; status.className = 'form-msg';
  fill.style.width = '0%';
  show(bar);
  var file = staged.file;
  var fileType = file.type || 'video/mp4';
  api('/v1/uploads', { method: 'POST', body: { contentType: fileType, sizeBytes: file.size } }).then(function (r) {
    var d = r.data;
    var setProgress = function (pct) {
      fill.style.width = pct + '%';
      status.textContent = t('uploadingPct').replace('{p}', pct);
    };
    if (d.mode === 'direct' && d.uploadUrl) {
      return xhrUpload('PUT', d.uploadUrl, file, { 'Content-Type': fileType }, setProgress)
        .then(function () { return api('/v1/uploads/' + d.mediaId + '/complete', { method: 'POST', body: {} }); })
        .then(function () { return d; });
    }
    return xhrUpload('POST', CONFIG.apiBase + d.uploadPath, file,
      { Authorization: 'Bearer ' + S.token, 'Content-Type': fileType }, setProgress)
      .then(function () { return d; });
  }).then(function (d) {
    return api('/v1/videos', {
      method: 'POST',
      body: {
        sourceUrl: d.sourceUrl, durationSec: staged.durationSec, caption: caption, hashtags: [],
        musicTrackId: selectedMusic ? selectedMusic.id : undefined
      }
    });
  }).then(function (r) {
    hide(bar);
    var video = r.data.video;
    if (r.data.xpAward) applyXpAward(r.data.xpAward);
    S.feed = [video].concat(S.feed.filter(function (x) { return !x.local; }));
    renderFeed();
    pendingUpload = null;
    hide(btn);
    $('upload-file').value = '';
    $('upload-caption').value = '';
    $('upload-preview').innerHTML = ''; hide($('upload-preview'));
    selectedMusic = null;
    renderMusicRow();
    hide($('upload-music-row'));
    stopMusicPreview();
    toast(video.status === 'pending'
      ? (video.music ? t('uploadMixingToast') : t('uploadCheckingToast'))
      : t('uploadPosted'));
    closeCreate();
  }).catch(function (e) {
    hide(bar);
    staged.busy = false;
    btn.disabled = false;
    if (e && e.data && e.data.code === 'UPLOAD_TOO_LARGE') status.textContent = t('uploadTooBig');
    else if (e && e.status) status.textContent = localizedError(e);
    else status.textContent = t('uploadFailed');
    status.classList.add('error');
  });
}

/* ---------------- music picker ("Add a song") ----------------
 * The library comes from GET /v1/music (server src/music.js); the
 * pick rides POST /v1/videos as musicTrackId and the server mixes
 * the song over the upload. One shared preview <audio>: tap a
 * track's play button to hear it, tap again to stop. Selecting a
 * row closes the sheet; "No song" clears the pick. */
var musicTracksCache = null;   // null = not loaded yet; [] = load failed / empty
var selectedMusic = null;      // catalogue entry or null
var musicPreviewAudio = null;
var musicPreviewId = null;

function fmtSongTime(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
}
function renderMusicRow() {
  var name = $('upload-music-name');
  if (!name) return;
  name.textContent = selectedMusic
    ? selectedMusic.title + ' · ' + selectedMusic.artist
    : t('addSongNone');
}
function stopMusicPreview() {
  if (musicPreviewAudio) { try { musicPreviewAudio.pause(); } catch (e) { /* ignore */ } }
  musicPreviewId = null;
  var list = $('music-list');
  if (list) {
    var btns = list.querySelectorAll('.music-play');
    for (var i = 0; i < btns.length; i++) {
      btns[i].innerHTML = LOOPI_ICONS.svg('play', 'ic');
      btns[i].setAttribute('aria-label', t('previewSong'));
    }
    var rows = list.querySelectorAll('.music-track');
    for (var j = 0; j < rows.length; j++) rows[j].classList.remove('playing');
  }
}
function toggleMusicPreview(track, btn, row) {
  if (musicPreviewId === track.id) { stopMusicPreview(); return; }
  stopMusicPreview();
  if (!musicPreviewAudio) musicPreviewAudio = new Audio();
  musicPreviewAudio.src = mediaSrc(track.url);
  musicPreviewId = track.id;
  btn.innerHTML = LOOPI_ICONS.svg('pause', 'ic');
  btn.setAttribute('aria-label', t('stopSong'));
  if (row) row.classList.add('playing');
  var p = musicPreviewAudio.play();
  if (p && p.catch) p.catch(function () { stopMusicPreview(); });
}
function musicPickButton(track) {
  var pick = el('button', 'music-pick');
  var main = el('span', 'music-track-main');
  main.appendChild(el('span', 'music-track-title', track ? track.title : t('addSongNone')));
  if (track) main.appendChild(el('span', 'music-track-artist', track.artist));
  pick.appendChild(main);
  if (track) {
    var side = el('span', 'music-track-side');
    side.appendChild(el('span', 'mood-chip', t('mood_' + track.mood)));
    side.appendChild(el('span', 'music-track-dur', fmtSongTime(track.durationSec)));
    pick.appendChild(side);
  }
  pick.addEventListener('click', function () {
    selectedMusic = track;
    renderMusicRow();
    closeMusicSheet();
  });
  return pick;
}
function renderMusicList() {
  var list = $('music-list');
  if (!list) return;
  stopMusicPreview();
  list.innerHTML = '';
  var noneRow = el('div', 'music-track' + (!selectedMusic ? ' selected' : ''));
  var noteIc = el('span', 'music-note-ic');
  noteIc.innerHTML = LOOPI_ICONS.svg('music', 'ic');
  noneRow.appendChild(noteIc);
  noneRow.appendChild(musicPickButton(null));
  if (!selectedMusic) {
    var nck = el('span', 'music-check');
    nck.innerHTML = LOOPI_ICONS.svg('check', 'ic');
    noneRow.appendChild(nck);
  }
  list.appendChild(noneRow);
  if (musicTracksCache && !musicTracksCache.length) {
    list.appendChild(el('p', 'sub', t('musicUnavailable')));
    return;
  }
  (musicTracksCache || []).forEach(function (track) {
    var isSel = !!(selectedMusic && selectedMusic.id === track.id);
    var row = el('div', 'music-track' + (isSel ? ' selected' : ''));
    var playBtn = el('button', 'music-play');
    playBtn.innerHTML = LOOPI_ICONS.svg('play', 'ic');
    playBtn.setAttribute('aria-label', t('previewSong'));
    playBtn.addEventListener('click', function () { toggleMusicPreview(track, playBtn, row); });
    row.appendChild(playBtn);
    row.appendChild(musicPickButton(track));
    if (isSel) {
      var ck = el('span', 'music-check');
      ck.innerHTML = LOOPI_ICONS.svg('check', 'ic');
      row.appendChild(ck);
    }
    list.appendChild(row);
  });
}
function openMusicSheet() {
  show($('music-sheet'));
  updateBottomBar();
  renderMusicList();
  if (!musicTracksCache) {
    api('/v1/music').then(function (r) {
      musicTracksCache = (r.data && r.data.tracks) || [];
      renderMusicList();
    }).catch(function () {
      musicTracksCache = [];
      renderMusicList();
    });
  }
}
function closeMusicSheet() {
  stopMusicPreview();
  var sheet = $('music-sheet');
  if (sheet) hide(sheet);
  updateBottomBar();
}

function submitGenerate() {
  var status = $('gen-status');
  var prompt = $('gen-prompt').value.trim();
  status.textContent = ''; status.className = 'form-msg';
  hide($('gen-result'));
  if (prompt.length < 3) { status.textContent = t('genDescribeFirst'); status.classList.add('error'); return; }
  if (S.demo || !S.token) {
    status.textContent = t('genNeedsAccount');
    status.classList.add('error');
    return;
  }
  var cost = S.genDuration <= 10 ? 1 : 2;
  if ((S.credits ? S.credits.balance : 0) < cost) {
    status.textContent = t('genNotEnough').replace('{n}', cost);
    status.classList.add('error');
    /* Kay 22:26: the buy-credits window pops up right here, at the
     * moment of intent — nobody hunts for the shop. */
    openCreditsPopup(cost, true);
    return;
  }
  var btn = $('gen-btn');
  btn.disabled = true;
  btn.textContent = '…';
  api('/v1/generate', { method: 'POST', body: { prompt: prompt, durationSec: S.genDuration } }).then(function (r) {
    btn.disabled = false; btn.textContent = t('generate');
    S.credits.balance = r.data.balance;
    applyXpAward(r.data.xpAward);
    updateGenBalance(); refreshCreditsPill();
    var box = $('gen-result');
    box.innerHTML = '';
    var v = document.createElement('video');
    v.src = r.data.video.sourceUrl; v.controls = true; v.loop = true; v.playsInline = true;
    box.appendChild(v);
    box.appendChild(el('div', 'gr-cap', '✦ ' + (r.data.video.caption || prompt) + ' ' + t('genResultCaption').replace('{n}', (r.data.creditsCharged || cost))));
    show(box);
    S.feed = [r.data.video].concat(S.feed);
    renderFeed();
    if (r.data.video.status === 'pending') toast(t('uploadCheckingToast'));
    status.textContent = t('genDone');
    status.classList.add('ok');
  }).catch(function (e) {
    btn.disabled = false; btn.textContent = t('generate');
    if (e.status === 503 || (e.data && e.data.code === 'GENERATION_NOT_CONFIGURED')) {
      status.textContent = localizedError(e);
    } else if (e.status === 402 || (e.data && e.data.code === 'INSUFFICIENT_CREDITS')) {
      status.textContent = t('genNotEnoughFull');
      if (e.data && typeof e.data.balance === 'number') { S.credits.balance = e.data.balance; updateGenBalance(); refreshCreditsPill(); }
      openCreditsPopup((e.data && e.data.needed) || cost, true);
    } else if (e.status === 0) {
      status.textContent = t('genServerUnreachable');
    } else {
      status.textContent = localizedError(e);
    }
    status.classList.add('error');
  });
}

/* Apply an xpAward summary from the server (upload / generation
 * responses): keep the local user in sync and celebrate level-ups
 * and new badges instead of letting them pass silently. */
function applyXpAward(xa) {
  if (!xa || !S.user) return;
  if (typeof xa.totalXp === 'number') S.user.xp = xa.totalXp;
  if (typeof xa.creatorLevel === 'number') S.user.creatorLevel = xa.creatorLevel;
  if (Array.isArray(xa.newBadges) && xa.newBadges.length) {
    if (!Array.isArray(S.user.badges)) S.user.badges = [];
    var held = {};
    S.user.badges.forEach(function (b) { held[b.id || b] = true; });
    xa.newBadges.forEach(function (b) { if (b && !held[b.id]) S.user.badges.push(b); });
    toast(t('badgeToast') + xa.newBadges.map(function (b) { return badgeDisplayName(b); }).join(', '));
  } else if (xa.levelledUp) {
    toast(t('levelUpToast') + ' ' + t('level') + ' ' + xa.creatorLevel);
  }
  paintProfile();
}

/* ---------------- inbox + chat ---------------- */
function roomTitle(room) {
  if (room.name) return room.name;
  if (room.type === 'dm') return t('directMessage');
  return room.type;
}
function roomSub(room) {
  var bits = [STRINGS[lang]['roomKind_' + room.type] || room.type];
  if (room.demo) bits.push(t('demoTag'));
  if (room.hasPassword) bits.push(t('roomPasswordTag'));
  return bits.join(' · ');
}
function loadRooms() {
  if (S.demo || !S.token) { S.rooms = DEMO_ROOMS.slice(); renderRooms(); return; }
  api('/v1/rooms').then(function (r) { S.rooms = r.data.rooms || []; renderRooms(); })
    .catch(function () { S.rooms = DEMO_ROOMS.slice(); renderRooms(); });
}
function renderRooms() {
  var list = $('room-list');
  list.innerHTML = '';
  if (!S.rooms.length) list.appendChild(el('p', 'sub', t('noChatsYet')));
  S.rooms.forEach(function (room) {
    var row = el('button', 'room-row');
    row.appendChild(el('span', 'mini-avatar', initial(roomTitle(room))));
    var main = el('span', 'rr-main');
    main.appendChild(el('div', 'rr-name', roomTitle(room)));
    main.appendChild(el('div', 'rr-sub', roomSub(room)));
    row.appendChild(main);
    if (room.hasPassword) { var rlk = el('span', 'rr-lock'); rlk.innerHTML = LOOPI_ICONS.svg('lock', 'ic ic-inline'); row.appendChild(rlk); }
    if (S.roomUnread[room.id]) row.appendChild(el('span', 'rr-unread', String(S.roomUnread[room.id])));
    if (room.demo) row.appendChild(el('span', 'demo-tag', t('demoTag')));
    row.addEventListener('click', function () { openRoom(room); });
    list.appendChild(row);
  });
}
function openRoom(room) {
  if (!room.demo && !S.demo && S.token && room.type === 'private' &&
      room.memberIds && S.user && room.memberIds.indexOf(S.user.id) < 0) {
    var pw = window.prompt(t('roomPrivatePrompt'));
    if (pw === null) return;
    api('/v1/rooms/' + room.id + '/join', { method: 'POST', body: { password: pw } }).then(function () {
      loadRooms();
      enterChat(room);
    }).catch(function (e) { toast(localizedError(e)); });
    return;
  }
  if (!room.demo && !S.demo && S.token && room.type === 'open' &&
      room.memberIds && S.user && room.memberIds.indexOf(S.user.id) < 0) {
    api('/v1/rooms/' + room.id + '/join', { method: 'POST', body: {} }).then(function () {
      loadRooms(); enterChat(room);
    }).catch(function () { enterChat(room); });
    return;
  }
  enterChat(room);
}
function enterChat(room) {
  S.currentRoom = room;
  /* Opening a room clears its live unread badge and restarts the
   * rendered-message ledger the real-time appender dedupes with. */
  if (S.roomUnread[room.id]) { delete S.roomUnread[room.id]; renderRooms(); }
  S.chatSeen = {};
  $('chat-title').textContent = roomTitle(room);
  $('chat-demo-tag').classList.toggle('hidden', !room.demo);
  $('chat-game-btn').classList.toggle('hidden', room.type !== 'group');
  $('chat-msg').textContent = '';
  showPanel('chat');
  loadMessages();
}

/* ---- group game cards (session + results) ----
 * GENERIC by design: the card reads its game from the message
 * payload and resolves it through the hub's GAMES table (the server
 * says 'food', the hub calls it 'foodninja' — GS_GAME_IDS is the
 * only mapping). A future group game (Penalty Shootout is next)
 * needs a GAMES entry + a server session type, and both cards work
 * unchanged. Group games are just for fun — no prizes, ever. */
var GS_GAME_IDS = { food: 'foodninja' };
function gsGameOf(payload) {
  var id = payload && GS_GAME_IDS[payload.game];
  return (id && gameById(id)) || gameById('foodninja');
}
/* Medal ranks render as gradient chips (.gs-rank.medal.m1/.m2/.m3),
 * not emoji — 2030 pass. */
function mcGameLine(iconName, label, g, fallback) {
  var d = el('div', 'mc-game');
  if (iconName) { var ic = el('span', 'mc-ic'); ic.innerHTML = LOOPI_ICONS.svg(iconName, 'ic ic-inline'); d.appendChild(ic); }
  if (label) d.appendChild(document.createTextNode(' ' + label + ' · '));
  if (g) {
    var im = el('span', 'mc-game-ic'); im.innerHTML = LOOPI_ICONS.gameImg(g.id, 'game-png-sm'); d.appendChild(im);
    d.appendChild(document.createTextNode(' ' + t(g.nameKey)));
  } else if (fallback) d.appendChild(document.createTextNode(fallback));
  return d;
}
function gsStandingRow(s) {
  var row = el('div', 'gs-standing' + (S.user && s.userId === S.user.id ? ' me' : ''));
  row.appendChild(el('span', 'gs-rank' + (s.rank >= 1 && s.rank <= 3 ? ' medal m' + s.rank : ''), String(s.rank)));
  row.appendChild(el('span', 'gs-who', s.name || s.handle || ''));
  row.appendChild(el('span', 'gs-score', String(s.score)));
  return row;
}
function gameSessionCard(m) {
  var p = m.game || {};
  var g = gsGameOf(p);
  var card = el('div', 'msg-challenge gs-card');
  card.appendChild(mcGameLine('game', t('gsGroupGame'), g, p.game || ''));
  var hostName = m.sender ? (m.sender.displayName || m.sender.handle) : '';
  card.appendChild(el('div', 'mc-text', (hostName ? hostName + ' ' : '') + t('gsSessionBy')));
  var statusKey = p.status === 'playing' ? 'gsStatusPlaying' : (p.status === 'finished' ? 'gsStatusFinished' : 'gsStatusLobby');
  var row = el('div', 'gs-card-row');
  row.appendChild(el('span', 'gs-status gs-status-' + (p.status || 'lobby'), t(statusKey)));
  row.appendChild(el('span', 'gs-noprize', t('gsNoPrizes')));
  card.appendChild(row);
  if (m.demo) card.appendChild(el('span', 'demo-tag', t('demoTag')));
  if (p.status !== 'finished') {
    var join = el('button', 'primary mc-accept gs-join', t('gsJoin'));
    join.addEventListener('click', function () { if (window.GroupGames) GroupGames.joinFromCard(m); });
    card.appendChild(join);
  }
  return card;
}
function gameResultsCard(m) {
  var p = m.game || {};
  var g = gsGameOf(p);
  var card = el('div', 'msg-challenge gs-card gs-results');
  card.appendChild(mcGameLine('trophy', t('gsResults'), g, p.game || ''));
  var rows = el('div', 'gs-standings');
  (p.standings || []).forEach(function (s) { rows.appendChild(gsStandingRow(s)); });
  card.appendChild(rows);
  card.appendChild(el('div', 'gs-noprize', t('gsNoPrizes')));
  if (m.demo) card.appendChild(el('span', 'demo-tag', t('demoTag')));
  return card;
}
function messageNode(m) {
  var mine = m.mine !== undefined ? m.mine : (S.user && m.sender && m.sender.id === S.user.id);
  var node = el('div', 'msg ' + (mine ? 'me' : 'them'));
  var who = m.sender ? (m.sender.displayName || m.sender.handle) : '';
  if (who && !mine) node.appendChild(el('span', 'msg-who', who));
  if (m.type === 'challenge') {
    var cti = el('span', 'mc-ic'); cti.innerHTML = LOOPI_ICONS.svg('trophy', 'ic ic-inline gold-ic'); node.appendChild(cti);
    node.appendChild(document.createTextNode(' ' + t('challengeTitle')));
    var g = gameById(m.gameId);
    var cc = el('div', 'msg-challenge');
    cc.setAttribute('data-game-id', m.gameId || '');
    cc.appendChild(mcGameLine(null, null, g, m.gameId));
    cc.appendChild(el('div', 'mc-text', m.scoreText || t('challengeDefault')));
    if (m.demo) cc.appendChild(el('span', 'demo-tag', t('demoTag')));
    var acc = el('button', 'primary mc-accept', t('acceptChallenge'));
    acc.addEventListener('click', function () { openGame(m.gameId); });
    cc.appendChild(acc);
    node.appendChild(cc);
  } else if (m.type === 'video') {
    node.appendChild(el('span', null, t('sharedVideo')));
    var vid = findVideo(m.videoId);
    var card = el('button', 'msg-video');
    var poster = el('div', 'mv-poster');
    poster.innerHTML = LOOPI_ICONS.svg('play', 'ic poster-play');
    poster.style.background = gradientFor(vid && vid.owner ? vid.owner.handle : (m.videoId || 'v'));
    card.appendChild(poster);
    card.appendChild(el('div', 'mv-cap', vid ? (vid.caption || '') : t('videoWord')));
    card.addEventListener('click', function () { if (vid) jumpToVideo(vid); });
    node.appendChild(card);
  } else if (m.type === 'game_session') {
    node.appendChild(gameSessionCard(m));
  } else if (m.type === 'game_results') {
    node.appendChild(gameResultsCard(m));
  } else if (m.type === 'voice') {
    node.appendChild(voiceBubbleNode(m));
    var tr = m.voice && m.voice.transcript;
    if (tr && tr.state === 'done' && tr.text) {
      node.appendChild(el('div', 'voice-transcript', tr.text));
    } else if (tr && tr.state === 'pending') {
      node.appendChild(el('div', 'voice-transcript pending', t('transcribing')));
    }
  } else {
    node.appendChild(document.createTextNode(m.text || ''));
  }
  return node;
}
function findVideo(id) {
  var all = S.feed.concat(DEMO_FEED);
  for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
  return null;
}
function loadMessages() {
  var wrap = $('chat-messages');
  wrap.innerHTML = '';
  var room = S.currentRoom;
  if (!room) return;
  if (room.demo || S.demo || !S.token) {
    (DEMO_MESSAGES[room.id] || []).forEach(function (m) { wrap.appendChild(messageNode(m)); });
    wrap.scrollTop = wrap.scrollHeight;
    return;
  }
  api('/v1/rooms/' + room.id + '/messages').then(function (r) {
    wrap.innerHTML = '';
    (r.data.messages || []).forEach(function (m) { S.chatSeen[m.id] = 1; wrap.appendChild(messageNode(m)); });
    armVoiceTranscriptPoll(r.data.messages || []);
    // Game challenges are a local demo layer for now (labelled demo in
    // the card) — they append after the server's real messages.
    (LOCAL_CHALLENGES[room.id] || []).forEach(function (m) { wrap.appendChild(messageNode(m)); });
    wrap.scrollTop = wrap.scrollHeight;
  }).catch(function (e) { $('chat-msg').textContent = localizedError(e); });
}
function sendChatMessage() {
  var room = S.currentRoom;
  var text = $('chat-input').value.trim();
  if (!room || !text) return;
  $('chat-input').value = '';
  if (room.demo || S.demo || !S.token) {
    var m = { id: 'local_' + Date.now(), sender: S.user, type: 'text', text: text, mine: true };
    if (!DEMO_MESSAGES[room.id]) DEMO_MESSAGES[room.id] = [];
    DEMO_MESSAGES[room.id].push(m);
    $('chat-messages').appendChild(messageNode(m));
    $('chat-messages').scrollTop = $('chat-messages').scrollHeight;
    return;
  }
  api('/v1/rooms/' + room.id + '/messages', { method: 'POST', body: { type: 'text', text: text } })
    .then(function (r) {
      S.chatSeen[r.data.message.id] = 1;
      $('chat-messages').appendChild(messageNode(r.data.message));
      $('chat-messages').scrollTop = $('chat-messages').scrollHeight;
    })
    .catch(function (e) { $('chat-msg').textContent = localizedError(e); });
}
function toggleSharePicker() {
  var picker = $('share-picker');
  if (!picker.classList.contains('hidden')) { hide(picker); return; }
  var list = $('share-picker-list');
  list.innerHTML = '';
  var pool = S.feed.length ? S.feed : DEMO_FEED;
  pool.slice(0, 10).forEach(function (v) {
    var item = el('div', 'share-pick');
    var art = el('div', 'sp-art', posterEmoji(v));
    art.style.background = gradientFor(v.owner ? v.owner.handle : v.id);
    item.appendChild(art);
    item.appendChild(el('div', 'sp-cap', v.caption || ''));
    item.addEventListener('click', function () { shareVideoIntoChat(v); hide(picker); });
    list.appendChild(item);
  });
  show(picker);
}
function shareVideoIntoChat(video) {
  var room = S.currentRoom;
  if (!room) return;
  if (room.demo || S.demo || !S.token || video.demo) {
    var m = { id: 'local_' + Date.now(), sender: S.user, type: 'video', videoId: video.id, mine: true };
    if (!DEMO_MESSAGES[room.id]) DEMO_MESSAGES[room.id] = [];
    DEMO_MESSAGES[room.id].push(m);
    $('chat-messages').appendChild(messageNode(m));
    $('chat-messages').scrollTop = $('chat-messages').scrollHeight;
    return;
  }
  api('/v1/rooms/' + room.id + '/messages', { method: 'POST', body: { type: 'video', videoId: video.id } })
    .then(function (r) {
      S.chatSeen[r.data.message.id] = 1;
      $('chat-messages').appendChild(messageNode(r.data.message));
      $('chat-messages').scrollTop = $('chat-messages').scrollHeight;
    })
    .catch(function (e) { $('chat-msg').textContent = localizedError(e); });
}
/* ---------------- voice messages ----------------
 * Record in the chat composer (MediaRecorder + getUserMedia — the
 * mic permission plumbing is the same one live video uses), upload
 * the clip through the normal uploads flow, then post a
 * {type:'voice'} message. The server verifies the audio media and
 * transcribes asynchronously (src/transcribe.js): the transcript
 * resolves on the stored message and this panel picks it up by
 * refetching while any visible transcript is still 'pending'.
 * Playback is one shared <audio> (the music-preview pattern): one
 * bubble plays at a time and starting another stops the first. */
var VOICE_MAX_SEC = 60; // mirrors config.MAX_VOICE_SECONDS server-side
var voiceRec = null;    // {recorder, stream, chunks, mimeType, startedAt, timer, roomId}
var voiceAudio = null;
var voicePlayingId = null;
var voicePlayBtn = null;
var voicePlayFill = null;
var voicePollTimer = null;

function voiceSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}
function chatInputRowEl() { return document.querySelector('#panel-chat .chat-input-row'); }
function setRecordingUi(on) {
  var row = $('voice-rec-row');
  var inputRow = chatInputRowEl();
  if (row) row.classList.toggle('hidden', !on);
  if (inputRow) inputRow.classList.toggle('hidden', on);
}
function stopVoiceTracks(rec) {
  if (rec.stream) rec.stream.getTracks().forEach(function (tr) { try { tr.stop(); } catch (e) { /* ignore */ } });
}
function startVoiceRecording() {
  var room = S.currentRoom;
  if (!room || voiceRec) return;
  if (room.demo || S.demo || !S.token) { $('chat-msg').textContent = t('voiceNeedsAccount'); return; }
  if (!voiceSupported()) { $('chat-msg').textContent = t('voiceUnsupported'); return; }
  $('chat-msg').textContent = '';
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
    if (!S.currentRoom || S.currentRoom.id !== room.id) { // left the chat while the prompt was up
      stream.getTracks().forEach(function (tr) { tr.stop(); });
      return;
    }
    var mimeType = '';
    ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].forEach(function (cand) {
      if (!mimeType && window.MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(cand)) mimeType = cand;
    });
    var recorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType: mimeType }) : new MediaRecorder(stream);
    } catch (e) {
      stream.getTracks().forEach(function (tr) { tr.stop(); });
      $('chat-msg').textContent = t('voiceUnsupported');
      return;
    }
    var rec = {
      recorder: recorder, stream: stream, chunks: [],
      mimeType: recorder.mimeType || mimeType || 'audio/webm',
      startedAt: Date.now(), timer: null, roomId: room.id
    };
    recorder.ondataavailable = function (e) { if (e.data && e.data.size) rec.chunks.push(e.data); };
    voiceRec = rec;
    setRecordingUi(true);
    $('voice-rec-time').textContent = '0:00';
    rec.timer = setInterval(function () {
      var secs = Math.floor((Date.now() - rec.startedAt) / 1000);
      $('voice-rec-time').textContent = fmtSongTime(secs);
      if (secs >= VOICE_MAX_SEC) stopVoiceRecording(true); // cap reached: send what we have
    }, 250);
    recorder.start(250);
  }).catch(function () { $('chat-msg').textContent = t('voiceMicDenied'); });
}
/* Stop the active recording; sendIt=true uploads + posts it,
 * false discards it. Safe to call when nothing is recording. */
function stopVoiceRecording(sendIt) {
  var rec = voiceRec;
  if (!rec) return;
  voiceRec = null;
  if (rec.timer) clearInterval(rec.timer);
  setRecordingUi(false);
  var finish = function () {
    stopVoiceTracks(rec);
    if (!sendIt) return;
    var blob = new Blob(rec.chunks, { type: rec.mimeType });
    var durationSec = Math.max(1, Math.min(VOICE_MAX_SEC, Math.round((Date.now() - rec.startedAt) / 1000)));
    if (blob.size) sendVoiceBlob(blob, durationSec, rec.roomId);
  };
  rec.recorder.onstop = finish;
  if (rec.recorder.state !== 'inactive') {
    try { rec.recorder.stop(); } catch (e) { finish(); }
  } else finish();
}
/* The uploads flow, voice edition: reserve -> move the bytes ->
 * post the message (same three steps as submitUpload). */
function sendVoiceBlob(blob, durationSec, roomId) {
  var room = S.currentRoom;
  if (!room || room.id !== roomId) return;
  $('chat-msg').textContent = t('voiceSending');
  var fileType = (blob.type || 'audio/webm').split(';')[0];
  api('/v1/uploads', { method: 'POST', body: { contentType: fileType, sizeBytes: blob.size } }).then(function (r) {
    var d = r.data;
    if (d.mode === 'direct' && d.uploadUrl) {
      return xhrUpload('PUT', d.uploadUrl, blob, { 'Content-Type': fileType }, null)
        .then(function () { return api('/v1/uploads/' + d.mediaId + '/complete', { method: 'POST', body: {} }); })
        .then(function () { return d; });
    }
    return xhrUpload('POST', CONFIG.apiBase + d.uploadPath, blob,
      { Authorization: 'Bearer ' + S.token, 'Content-Type': fileType }, null)
      .then(function () { return d; });
  }).then(function (d) {
    return api('/v1/rooms/' + roomId + '/messages', {
      method: 'POST', body: { type: 'voice', mediaId: d.mediaId, durationSec: durationSec }
    });
  }).then(function (r) {
    $('chat-msg').textContent = '';
    if (S.currentRoom && S.currentRoom.id === roomId) {
      S.chatSeen[r.data.message.id] = 1;
      $('chat-messages').appendChild(messageNode(r.data.message));
      $('chat-messages').scrollTop = $('chat-messages').scrollHeight;
      if (r.data.message.voice && r.data.message.voice.transcript &&
          r.data.message.voice.transcript.state === 'pending') {
        armVoiceTranscriptPoll([r.data.message]);
      }
    }
  }).catch(function (e) {
    $('chat-msg').textContent = (e && e.status) ? localizedError(e) : t('voiceSendFailed');
  });
}
function stopVoicePlayback() {
  if (voiceAudio) { try { voiceAudio.pause(); } catch (e) { /* ignore */ } }
  if (voicePlayBtn) voicePlayBtn.innerHTML = LOOPI_ICONS.svg('play', 'ic');
  if (voicePlayFill) voicePlayFill.style.width = '0%';
  voicePlayingId = null; voicePlayBtn = null; voicePlayFill = null;
}
function voiceBubbleNode(m) {
  var v = m.voice || {};
  var box = el('div', 'msg-voice');
  var btn = el('button', 'voice-play');
  btn.innerHTML = LOOPI_ICONS.svg(voicePlayingId === m.id ? 'pause' : 'play', 'ic');
  btn.setAttribute('aria-label', t('titleVoiceMessage'));
  var prog = el('div', 'voice-progress');
  var fill = el('div', 'voice-progress-fill');
  prog.appendChild(fill);
  box.appendChild(btn);
  box.appendChild(prog);
  box.appendChild(el('span', 'voice-dur', fmtSongTime(v.durationSec || 0)));
  btn.addEventListener('click', function () { toggleVoicePlayback(m, btn, fill); });
  return box;
}
function toggleVoicePlayback(m, btn, fill) {
  if (voicePlayingId === m.id) { stopVoicePlayback(); return; }
  stopVoicePlayback();
  var v = m.voice || {};
  if (!voiceAudio) {
    voiceAudio = new Audio();
    voiceAudio.addEventListener('timeupdate', function () {
      if (voicePlayFill && voiceAudio.duration > 0) {
        voicePlayFill.style.width = Math.min(100, (voiceAudio.currentTime / voiceAudio.duration) * 100) + '%';
      }
    });
    voiceAudio.addEventListener('ended', stopVoicePlayback);
  }
  voiceAudio.src = mediaSrc(v.url || ('/v1/media/' + v.mediaId));
  voicePlayingId = m.id; voicePlayBtn = btn; voicePlayFill = fill;
  btn.innerHTML = LOOPI_ICONS.svg('pause', 'ic');
  var p = voiceAudio.play();
  if (p && p.catch) p.catch(function () { stopVoicePlayback(); });
}
/* While any rendered voice message still awaits its transcript,
 * refetch the room's messages every few seconds (the plain GET
 * flow) until none are pending. Never yanks a bubble that is
 * mid-playback — the next tick retries instead. */
function armVoiceTranscriptPoll(messages) {
  stopVoiceTranscriptPoll();
  var pending = (messages || []).some(function (m) {
    return m.type === 'voice' && m.voice && m.voice.transcript && m.voice.transcript.state === 'pending';
  });
  if (!pending) return;
  voicePollTimer = setInterval(function () {
    if (!S.currentRoom || S.currentPanel !== 'chat') { stopVoiceTranscriptPoll(); return; }
    if (voicePlayingId) return;
    loadMessages();
  }, 4000);
}
function stopVoiceTranscriptPoll() {
  if (voicePollTimer) { clearInterval(voicePollTimer); voicePollTimer = null; }
}

function createRoom() {
  var name = $('room-name').value.trim();
  var type = $('room-type').value;
  var password = $('room-password').value;
  var msg = $('room-msg');
  msg.textContent = ''; msg.className = 'form-msg';
  if (!name) { msg.textContent = t('roomNameRequired'); msg.classList.add('error'); return; }
  if (type === 'private' && password.length < 4) { msg.textContent = t('roomPasswordShort'); msg.classList.add('error'); return; }
  if (S.demo || !S.token) {
    var room = { id: 'demo_room_' + Date.now(), type: type, name: name, hasPassword: type === 'private', demo: true };
    DEMO_ROOMS.unshift(room);
    DEMO_MESSAGES[room.id] = [];
    S.rooms = DEMO_ROOMS.slice();
    renderRooms();
    msg.textContent = t('roomDemoCreated');
    msg.classList.add('ok');
    return;
  }
  api('/v1/rooms', { method: 'POST', body: { type: type, name: name, password: type === 'private' ? password : undefined } })
    .then(function () {
      $('room-name').value = ''; $('room-password').value = '';
      msg.textContent = t('roomCreated');
      msg.classList.add('ok');
      loadRooms();
    })
    .catch(function (e) { msg.textContent = localizedError(e); msg.classList.add('error'); });
}

/* ---------------- live ---------------- */
function loadLive() {
  if (S.demo || !S.token) { S.liveRooms = DEMO_LIVE.slice(); renderLive(); return; }
  api('/v1/live').then(function (r) {
    /* Bug fix (QA #12): demo streams were concatenated into the REAL
     * "Live now" list (signed-in users saw DEMO cards and duplicates
     * of the same streamer). Signed-in lists show real rooms only,
     * deduped by streamer. */
    var seenStreamer = {};
    var real = (r.data.live || []).filter(function (room) {
      var k = room.streamer ? (room.streamer.id || room.streamer.handle) : room.id;
      if (seenStreamer[k]) return false;
      seenStreamer[k] = 1;
      return true;
    }).map(function (room) {
      return { id: room.id, demo: false, title: room.title, streamer: room.streamer, viewers: null, emoji: '🔴', liveRoom: room };
    });
    S.liveRooms = real;
    renderLive();
  }).catch(function () { S.liveRooms = []; renderLive(); });
}
function renderLive() {
  var grid = $('live-grid');
  grid.innerHTML = '';
  if (!S.liveRooms.length) grid.appendChild(el('p', 'sub', t('nobodyLive')));
  S.liveRooms.forEach(function (s) {
    var card = el('button', 'live-card');
    var art = el('div', 'lc-art');
    var artIc = el('span', 'lc-art-ic'); artIc.innerHTML = LOOPI_ICONS.svg('broadcast'); art.appendChild(artIc);
    art.style.background = gradientFor(s.streamer ? s.streamer.handle : s.id);
    art.appendChild(el('span', 'live-badge', '● LIVE'));
    card.appendChild(art);
    var body = el('div', 'lc-body');
    body.appendChild(el('div', 'lc-title', s.title));
    var meta = el('div', 'lc-meta');
    meta.appendChild(el('span', null, '@' + (s.streamer ? s.streamer.handle : '')));
    var vw = el('span', 'lc-viewers');
    if (s.viewers !== null && s.viewers !== undefined) { vw.innerHTML = LOOPI_ICONS.svg('eye', 'ic ic-inline'); vw.appendChild(document.createTextNode(' ' + fmtCount(s.viewers))); }
    else vw.textContent = s.demo ? '' : t('liveWord');
    meta.appendChild(vw);
    body.appendChild(meta);
    if (s.demo) { var dt = el('span', 'demo-tag', t('demoTag')); body.appendChild(dt); }
    card.appendChild(body);
    card.addEventListener('click', function () { openLiveRoom(s); });
    grid.appendChild(card);
  });
}
/* End the signed-in host's own stream (POST /v1/live/:id/end — the
 * endpoint existed; the web host view never called it, so a started
 * stream could never be ended — QA #2). */
function endLive() {
  var s = S.currentLive;
  if (!s || s.demo || !S.token) return;
  if (!window.confirm('End your stream now?')) return;
  api('/v1/live/' + s.id + '/end', { method: 'POST', body: {} }).then(function () {
    stopLiveChatPolling();
    stopLiveVideo();
    closeGiftShelf();
    S.currentLive = null;
    showPanel('live');
    loadLive();
    toast('Stream ended.');
  }).catch(function (e) { toast(localizedError(e)); });
}
function openLiveRoom(s) {
  S.currentLive = s;
  /* The End stream button belongs to the HOST only — viewers of
   * someone else's stream must never see it (QA #27). */
  var endBtn = $('lr-end-btn');
  if (endBtn) {
    var mine = !s.demo && S.user && s.streamer && s.streamer.id === S.user.id;
    endBtn.classList.toggle('hidden', !mine);
  }
  $('lr-title').textContent = s.title;
  $('lr-streamer').textContent = '@' + (s.streamer ? s.streamer.handle : '');
  $('lr-viewers-n').textContent = (s.viewers !== null && s.viewers !== undefined ? fmtCount(s.viewers) : '—');
  var art = $('lr-stage-art');
  art.classList.remove('hidden');
  art.innerHTML = '<span class="lr-stage-ic">' + LOOPI_ICONS.svg('broadcast') + '</span>';
  $('lr-video').classList.add('hidden');
  stopLiveVideo();
  art.style.background = gradientFor(s.streamer ? s.streamer.handle : s.id);
  $('lr-note').textContent = t('watchingDemo');
  $('tip-msg').textContent = '';
  S.liveConn = null;
  var conn = $('lr-conn');
  conn.classList.add('hidden');
  if (!s.demo && S.token) {
    /* Real room: ask the server for this room's join info. When it is
     * configured we store {url, token, identity, role} and start the
     * LiveKit video controller (live-video.js) on the stage. When the
     * server says LIVE_NOT_CONFIGURED, the honest notice above
     * (watchingDemo) already says exactly that, so it stays — and no
     * controller is ever created, so nothing pretends to be video. */
    api('/v1/live/' + s.id + '/token', { method: 'POST', body: {} }).then(function (r) {
      if (!S.currentLive || S.currentLive.id !== s.id) return; // navigated away
      S.liveConn = { url: r.data.url, token: r.data.token, identity: r.data.identity, room: r.data.room, role: r.data.role };
      conn.textContent = t('liveConnecting');
      conn.classList.remove('hidden');
      $('lr-note').textContent = '';
      startLiveVideo();
    }).catch(function (e) {
      if (S.currentLive && S.currentLive.id === s.id &&
          (!e || !e.data || e.data.code !== 'LIVE_NOT_CONFIGURED')) {
        $('lr-note').textContent = localizedError(e);
      }
    });
  }
  /* Chat: demo rooms keep the on-device sample lines. Real rooms run
   * the server live chat (GET/POST /v1/live/:id/messages): text lines
   * plus server-posted gift events, polled while the room is open —
   * the same messages store as chat, so it works whether or not the
   * video layer is configured. */
  stopLiveChatPolling();
  S.liveChatSeen = {};
  hide($('gift-sheet'));
  var chat = $('lr-chat');
  chat.innerHTML = '';
  if (s.demo || S.demo || !S.token) {
    DEMO_LIVE_CHAT.forEach(function (m) { chat.appendChild(liveTextRow(m.who, m.text)); });
    chat.scrollTop = chat.scrollHeight;
  } else {
    loadLiveChat(true);
    S.liveChatTimer = setInterval(pollLiveChat, 3500);
  }
  showPanel('live-room');
}
function liveTextRow(who, text) {
  var row = el('div', 'lc-msg');
  row.appendChild(el('b', null, who + ': '));
  row.appendChild(document.createTextNode(text));
  return row;
}
function giftDisplayName(g) {
  if (!g) return '';
  var key = g.nameKey || ('giftName_' + (g.giftId || g.id));
  var name = t(key);
  return name === key ? (g.giftId || g.id || '') : name;
}
function liveChatNode(m) {
  if (m.type === 'gift' && m.gift) {
    /* Gift events render distinctly: gold-tinted row, sender name,
     * then "sent a 🚀 Rocket" with the gift's localized name. */
    var row = el('div', 'lc-msg gift');
    var who = m.sender ? (m.sender.displayName || m.sender.handle) : '';
    row.appendChild(el('b', null, who + ' '));
    var gic = el('span', 'gift-ic');
    gic.innerHTML = LOOPI_ICONS.giftImg(m.gift.giftId || m.gift.id, 'gift-png-sm');
    row.appendChild(gic);
    row.appendChild(document.createTextNode(
      t('giftEventLine').replace('{gift}', giftDisplayName(m.gift))));
    return row;
  }
  return liveTextRow(m.sender ? m.sender.handle : '—', m.text || '');
}
function appendLiveMessage(m, animate) {
  if (!m || !m.id || S.liveChatSeen[m.id]) return;
  S.liveChatSeen[m.id] = 1;
  var chat = $('lr-chat');
  var nearBottom = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 90;
  chat.appendChild(liveChatNode(m));
  if (animate && m.type === 'gift' && m.gift && m.gift.tier === 'overlay') {
    showGiftAnimation(m.gift.giftId || m.gift.id);
  }
  if (nearBottom || animate) chat.scrollTop = chat.scrollHeight;
}
function loadLiveChat(initial) {
  var s = S.currentLive;
  if (!s || s.demo || !S.token) return;
  api('/v1/live/' + s.id + '/messages').then(function (r) {
    if (!S.currentLive || S.currentLive.id !== s.id) return; // navigated away
    (r.data.messages || []).forEach(function (m) { appendLiveMessage(m, !initial); });
  }).catch(function () { /* keep the last known chat */ });
}
function pollLiveChat() {
  if (S.currentPanel !== 'live-room' || !S.currentLive || S.currentLive.demo) {
    stopLiveChatPolling();
    return;
  }
  loadLiveChat(false);
}
function stopLiveChatPolling() {
  if (S.liveChatTimer) { clearInterval(S.liveChatTimer); S.liveChatTimer = null; }
}

/* ---- real live video (LiveKit) ----
 * The controller (live-video.js) owns the SDK connection; this layer
 * only maps its states onto the room chrome. When the server has no
 * LiveKit configured the token fetch fails first, S.liveConn stays
 * null, no controller is created and the honest placeholder note
 * remains on stage — video is never faked. */
function setLiveViewers(n) {
  var v = $('lr-viewers-n');
  if (v) v.textContent = String(n);
}
function startLiveVideo() {
  if (!window.LoopiLiveVideo || !S.liveConn) return;
  stopLiveVideo();
  var room = S.currentLive && S.currentLive.liveRoom;
  S.lkCtl = window.LoopiLiveVideo.createController({
    videoEl: $('lr-video'),
    artEl: $('lr-stage-art'),
    audioBox: $('lr-audio'),
    hostId: (room && room.streamerId) || (S.currentLive && S.currentLive.streamer && S.currentLive.streamer.id) || null,
    onState: onLiveVideoState,
    onViewers: function (n) { setLiveViewers(n); }
  });
  S.lkCtl.connect(S.liveConn);
}
function stopLiveVideo() {
  if (S.lkCtl) { try { S.lkCtl.disconnect(); } catch (e) { /* ignore */ } S.lkCtl = null; }
}
function onLiveVideoState(state) {
  if (S.currentPanel !== 'live-room' || !S.currentLive) return;
  var chip = $('lr-conn'), note = $('lr-note');
  function say(chipText, noteText) {
    if (chipText) { chip.textContent = chipText; chip.classList.remove('hidden'); }
    else chip.classList.add('hidden');
    note.textContent = noteText || '';
  }
  switch (state) {
    case 'connecting': say(t('liveConnecting'), ''); break;
    case 'onair': say(t('liveOnAir'), ''); break;
    case 'connected': say(t('liveConnected'), ''); break;
    case 'waiting': say(t('liveConnected'), t('liveWaitingMsg')); break;
    case 'reconnecting': say(t('liveReconnecting'), ''); break;
    case 'ended': say(null, t('liveEndedMsg')); break;
    case 'disconnected': say(null, t('liveLostMsg')); break;
    case 'denied': say(t('liveConnected'), t('liveDeniedMsg')); break;
    case 'unavailable': say(null, t('liveUnavailableMsg')); break;
  }
}
function sendLiveChat() {
  var text = $('lr-chat-input').value.trim();
  if (!text) return;
  var s = S.currentLive;
  $('lr-chat-input').value = '';
  if (!s || s.demo || S.demo || !S.token) {
    $('lr-chat').appendChild(liveTextRow(S.user ? S.user.handle : 'you', text));
    $('lr-chat').scrollTop = $('lr-chat').scrollHeight;
    return;
  }
  api('/v1/live/' + s.id + '/messages', { method: 'POST', body: { text: text } }).then(function (r) {
    appendLiveMessage(r.data.message, true);
  }).catch(function (e) {
    var msg = $('tip-msg');
    msg.textContent = localizedError(e);
    msg.className = 'form-msg error';
  });
}
/* ---------------- live gifts ----------------
 * The shelf renders from the server catalogue (GET /v1/live/gifts),
 * so the prices on screen are the prices the server charges. The
 * DEMO_GIFTS mirror below is only the demo/offline fallback — same
 * eight gifts, same prices, and demo sends charge nothing. */
var DEMO_GIFTS = [
  { id: 'rose', nameKey: 'giftName_rose', emoji: '🌹', credits: 1, tier: 'inline' },
  { id: 'heart', nameKey: 'giftName_heart', emoji: '❤️', credits: 5, tier: 'inline' },
  { id: 'star', nameKey: 'giftName_star', emoji: '⭐', credits: 10, tier: 'inline' },
  { id: 'crown', nameKey: 'giftName_crown', emoji: '👑', credits: 25, tier: 'inline' },
  { id: 'rocket', nameKey: 'giftName_rocket', emoji: '🚀', credits: 50, tier: 'overlay' },
  { id: 'diamond', nameKey: 'giftName_diamond', emoji: '💎', credits: 100, tier: 'overlay' },
  { id: 'castle', nameKey: 'giftName_castle', emoji: '🏰', credits: 250, tier: 'overlay' },
  { id: 'dragon', nameKey: 'giftName_dragon', emoji: '🐉', credits: 500, tier: 'overlay' }
];
function loadGiftCatalogue() {
  if (S.giftCatalogue) return Promise.resolve(S.giftCatalogue);
  if (S.demo || !S.token) { S.giftCatalogue = DEMO_GIFTS; return Promise.resolve(S.giftCatalogue); }
  return api('/v1/live/gifts').then(function (r) {
    S.giftCatalogue = (r.data.gifts && r.data.gifts.length) ? r.data.gifts : DEMO_GIFTS;
    return S.giftCatalogue;
  }).catch(function () { S.giftCatalogue = DEMO_GIFTS; return S.giftCatalogue; });
}
function openGiftShelf() {
  var msg = $('gift-msg');
  msg.textContent = ''; msg.className = 'form-msg';
  show($('gift-sheet'));
  updateBottomBar();
  renderGiftShelf();
  loadGiftCatalogue().then(renderGiftShelf);
}
function closeGiftShelf() {
  if ($('gift-sheet').classList.contains('hidden')) return;
  hide($('gift-sheet'));
  updateBottomBar();
}
function renderGiftShelf() {
  var bal = $('gift-balance');
  if (bal) bal.textContent = '✦ ' + (S.credits ? S.credits.balance : 0);
  var grid = $('gift-grid');
  if (!grid) return;
  grid.innerHTML = '';
  (S.giftCatalogue || DEMO_GIFTS).forEach(function (g) {
    var cell = el('button', 'gift-cell' +
      (S.credits && S.credits.balance < g.credits ? ' cant-afford' : ''));
    var gimg = el('span', 'gift-icon');
    gimg.innerHTML = LOOPI_ICONS.giftImg(g.id, 'gift-png');
    cell.appendChild(gimg);
    cell.appendChild(el('span', 'gift-name', giftDisplayName(g)));
    cell.appendChild(el('span', 'gift-price', '✦ ' + g.credits));
    cell.addEventListener('click', function () { sendGift(g); });
    grid.appendChild(cell);
  });
}
function sendGift(g) {
  var s = S.currentLive;
  var msg = $('gift-msg');
  msg.textContent = ''; msg.className = 'form-msg';
  if (!s || s.demo || S.demo || !S.token) {
    // Demo streams have no real streamer account behind them — say
    // so plainly and charge nothing.
    msg.textContent = t('giftDemo');
    return;
  }
  api('/v1/live/' + s.id + '/gift', { method: 'POST', body: { giftId: g.id } }).then(function (r) {
    if (S.credits && typeof r.data.balance === 'number') S.credits.balance = r.data.balance;
    refreshCreditsPill();
    renderGiftShelf();
    if (r.data.message) appendLiveMessage(r.data.message, true);
    var who = s.streamer ? s.streamer.displayName : t('theStreamer');
    var tm = $('tip-msg');
    tm.textContent = t('giftSentMsg')
      .replace('{gift}', giftDisplayName(g)).replace('{who}', who);
    tm.className = 'form-msg ok';
    setTimeout(closeGiftShelf, 650);
  }).catch(function (e) {
    msg.textContent = localizedError(e);
    msg.classList.add('error');
    if (e && e.data && e.data.code === 'INSUFFICIENT_CREDITS') {
      /* Honest route to more credits: the shared purchase popup
       * (whose own states — billing not wired yet — are stated
       * plainly there, never faked). */
      setTimeout(function () {
        closeGiftShelf();
        openCreditsPopup((e.data && e.data.needed) || g.credits, false);
      }, 900);
    }
  });
}
function showGiftAnimation(giftId) {
  var ov = $('lr-gift-overlay');
  if (!ov) return;
  var em = $('lr-gift-emoji');
  em.innerHTML = LOOPI_ICONS.giftImg(giftId, 'gift-png-xl');
  /* Restart the CSS animation even when the same gift repeats. */
  var clone = em.cloneNode(true);
  em.parentNode.replaceChild(clone, em);
  ov.classList.remove('hidden');
  setTimeout(function () { ov.classList.add('hidden'); }, 2250);
}
function tip(amount) {
  var s = S.currentLive;
  var msg = $('tip-msg');
  var who = s && s.streamer ? s.streamer.displayName : t('theStreamer');
  msg.textContent = '';
  msg.className = 'form-msg';
  if (!s || s.demo || S.demo || !S.token) {
    // Demo streams have no real streamer account behind them — say so
    // plainly and charge nothing.
    msg.textContent = t('tipDemo');
    return;
  }
  /* Tips are paid in credits via POST /v1/live/:id/tip. The server
   * moves the real balance and its messages state amounts only. */
  api('/v1/live/' + s.id + '/tip', { method: 'POST', body: { credits: amount } }).then(function (r) {
    if (S.credits && typeof r.data.balance === 'number') S.credits.balance = r.data.balance;
    refreshCreditsPill();
    if (typeof updateGenBalance === 'function') updateGenBalance();
    msg.textContent = t('tippedMsg').replace('{amount}', amount).replace('{who}', who);
    msg.classList.add('ok');
  }).catch(function (e) { msg.textContent = localizedError(e); msg.classList.add('error'); });
}
function goLive() {
  var msg = $('live-msg');
  msg.textContent = ''; msg.className = 'form-msg';
  if (S.demo || !S.token) {
    msg.textContent = t('goLiveNeedsAccount');
    msg.classList.add('error');
    return;
  }
  /* Bug fix (QA #2): going live used to happen on a single accidental
   * tap — no confirmation, no title, and then no way to end it. Ask
   * first; the host End flow is endLive() below. */
  if (!window.confirm('Go live now? Your stream will be public and listed under “Live now” until you end it.')) return;
  api('/v1/live', { method: 'POST', body: { title: (S.user.displayName || S.user.handle) + t('isLiveSuffix') } }).then(function (r) {
    var stream = r.data.stream || {};
    var room = r.data.liveRoom || {};
    if (stream.token && room.id) {
      /* Server is configured: walk the host straight onto their own
       * stage — openLiveRoom re-mints the join token and the video
       * controller publishes camera + microphone there. */
      loadLive();
      openLiveRoom({ id: room.id, demo: false, title: room.title,
        streamer: S.user, viewers: null, liveRoom: room });
    } else {
      msg.textContent = t('liveNotConfiguredMsg');
      loadLive();
    }
  }).catch(function (e) { msg.textContent = localizedError(e); msg.classList.add('error'); });
}

/* ---------------- profile / credits / levels ---------------- */
function refreshCreditsPill() {
  $('credits-pill').textContent = '✦ ' + (S.credits ? S.credits.balance : 0);
}
function loadCredits() {
  if (S.demo || !S.token) {
    if (!S.credits || !S.credits.demoSeeded) {
      S.credits = { balance: 3, packs: CREDIT_PACKS, ledger: [
        { delta: 3, reason: 'bonus', createdAt: Date.now() - 86400000 }
      ], demoSeeded: true };
    }
    if (!S.earnings) S.earnings = { balance: 12, history: [] };
    renderProfileCredits();
    refreshCreditsPill(); updateGenBalance();
    return;
  }
  api('/v1/credits').then(function (r) {
    S.credits = r.data;
    renderProfileCredits();
    refreshCreditsPill(); updateGenBalance();
  }).catch(function () { /* keep last known */ });
  api('/v1/me/earnings').then(function (r) {
    S.earnings = { balance: r.data.balance || 0, history: r.data.history || [] };
    renderProfileCredits();
  }).catch(function () { /* earnings stay at the last known value */ });
}
/* ONE purchase surface, two homes: the profile Shop/Credits tab and
 * the Generate-moment popup render the same packs and call the same
 * buyPack() against POST /v1/credits/purchase. The endpoint's honest
 * states (billing-not-configured, token required, verification
 * failures) surface verbatim — a purchase is never faked. */
function renderPackList(list, msg, fromPopup) {
  if (!list) return;
  list.innerHTML = '';
  (S.credits.packs || CREDIT_PACKS).forEach(function (pack) {
    var row = el('div', 'pack');
    var left = el('div');
    left.appendChild(el('div', 'pack-credits', '✦ ' + pack.credits + ' ' + t('credits')));
    /* Bug fix (QA #13): the per-credit label was a hardcoded
     * "$2.00 / credit" string while the packs actually price credits
     * at $0.02 each (1000 for $20) — 100x off. Compute it honestly
     * from the pack itself. */
    var perCredit = Number(pack.credits) > 0 ? (Number(pack.priceUsd) / Number(pack.credits)) : 0;
    left.appendChild(el('div', 'pack-price', '$' + Number(pack.priceUsd).toFixed(2) + ' · $' + perCredit.toFixed(2) + ' / credit'));
    row.appendChild(left);
    var buy = el('button', 'pack-buy', t('buy'));
    buy.addEventListener('click', function () { buyPack(pack, msg, fromPopup); });
    row.appendChild(buy);
    list.appendChild(row);
  });
}
function renderProfileCredits() {
  if (!S.credits) return;
  var bal = $('credits-balance');
  if (bal) bal.textContent = '✦ ' + S.credits.balance;
  var earn = $('earnings-balance');
  if (earn) earn.textContent = '✦ ' + (S.earnings ? S.earnings.balance : 0);
  renderPackList($('packs-list'), $('packs-msg'), false);
  var popupBal = $('credits-popup-balance');
  if (popupBal) popupBal.textContent = '✦ ' + S.credits.balance;
  renderPackList($('popup-packs-list'), $('popup-packs-msg'), true);
  var ledger = $('ledger-list');
  if (!ledger) return;
  ledger.innerHTML = '';
  (S.credits.ledger || []).slice(0, 8).forEach(function (e) {
    var row = el('div', 'ledger-row');
    row.appendChild(el('span', null, e.reason + (e.meta && e.meta.packId ? ' · ' + e.meta.packId : '')));
    row.appendChild(el('span', null, (e.delta > 0 ? '+' : '') + e.delta));
    ledger.appendChild(row);
  });
}
function openCreditsPopup(needed, returnToGenerate) {
  S.creditsNeeded = needed || 0;
  S.creditsReturnToGenerate = !!returnToGenerate;
  renderProfileCredits();
  var note = $('credits-popup-needed');
  if (note) {
    note.textContent = S.creditsNeeded
      ? t('creditsNeeded').replace('{n}', S.creditsNeeded)
      : '';
  }
  show($('credits-sheet'));
  updateBottomBar();
}
function closeCreditsPopup() {
  var sheet = $('credits-sheet');
  if (!sheet || sheet.classList.contains('hidden')) return;
  hide(sheet);
  updateBottomBar();
  if (S.creditsReturnToGenerate) {
    S.creditsReturnToGenerate = false;
    updateGenBalance();
    var prompt = $('gen-prompt');
    if (prompt) prompt.focus();
  }
}
function buyPack(pack, msg, fromPopup) {
  msg = msg || $('packs-msg');
  if (msg) { msg.textContent = ''; msg.className = 'form-msg'; }
  if (S.demo || !S.token) {
    if (msg) msg.textContent = t('checkoutDemo');
    return;
  }
  api('/v1/credits/purchase', { method: 'POST', body: { packId: pack.id } }).then(function (r) {
    S.credits.balance = r.data.balance;
    if (msg) {
      if (r.data.stub) {
        msg.textContent = t('packStubMsg').replace('{n}', r.data.granted);
      } else {
        msg.textContent = t('packAddedMsg').replace('{n}', r.data.granted);
        msg.classList.add('ok');
      }
    }
    refreshCreditsPill(); updateGenBalance();
    loadCredits();
    if (fromPopup) {
      /* The purchase state resolved: close the popup and hand the
       * user straight back to their Generate setup, balance fresh. */
      setTimeout(function () { closeCreditsPopup(); }, 450);
    }
  }).catch(function (e) {
    if (msg) { msg.textContent = localizedError(e); msg.classList.add('error'); }
  });
}
function userTags(user) {
  if (!user) return [];
  var tags = [];
  var lv = levelForLevel(user.creatorLevel || 1);
  tags.push('L' + lv.level + ' · ' + levelDisplayName(lv.name).toUpperCase());
  if ((user.xp || 0) >= 50) tags.push(t('tagUploader'));
  if ((user.interests || []).length >= 5) tags.push(t('tagExplorer'));
  return tags;
}
function userBadges(user) {
  if (!user) return [];
  var badges = [t('earlyMember')];
  /* Earned creator badges come from the server record (objects with
   * id/name/icon); they are the real name tags, not derived guesses. */
  if (Array.isArray(user.badges)) {
    user.badges.forEach(function (b) {
      badges.push(badgeDisplayName(b));
    });
  } else if ((user.creatorLevel || 1) >= 2) {
    badges.push(t('level') + ' ' + user.creatorLevel);
  }
  if ((user.interests || []).length) badges.push(user.interests.length + ' ' + t('interestsWord'));
  return badges;
}
/* Client mirror of the server's next-badge pick (used when the user
 * object didn't carry one, e.g. demo mode). */
function computeNextBadge(u) {
  if (!u) return null;
  var held = {};
  (Array.isArray(u.badges) ? u.badges : []).forEach(function (b) { held[b.id || b] = true; });
  var xp = u.xp || 0;
  var cands = [];
  if (!held.first_upload) cands.push({ id: 'first_upload', progress: 0, target: 1 });
  if (!held.likes_100) cands.push({ id: 'likes_100', progress: u.totalLikes || 0, target: 100 });
  if (!held.streak_7) cands.push({ id: 'streak_7', progress: (u.streak && u.streak.longest) || u.streakDays || 0, target: 7 });
  var lv = levelForXp(xp);
  var next = null;
  for (var i = 0; i < CREATOR_LEVELS.length; i++) if (CREATOR_LEVELS[i].level === lv.level + 1) next = CREATOR_LEVELS[i];
  if (next && !held['level_' + next.level]) cands.push({ id: 'level_' + next.level, progress: xp, target: next.minXp });
  if (!cands.length) return null;
  cands.sort(function (a, b) { return (b.progress / b.target) - (a.progress / a.target); });
  var c = cands[0];
  for (var j = 0; j < CREATOR_BADGES.length; j++) {
    if (CREATOR_BADGES[j].id === c.id) {
      return { id: c.id, name: CREATOR_BADGES[j].name, icon: CREATOR_BADGES[j].icon, progress: c.progress, target: c.target };
    }
  }
  return null;
}
function ownVideos() {
  var out = [];
  var seen = {};
  function add(v) {
    if (!v || !v.id || seen[v.id]) return;
    seen[v.id] = 1;
    out.push(v);
  }
  if (S.myProfile && S.myProfile.videos) S.myProfile.videos.forEach(add);
  if (S.demo) DEMO_MY_VIDEOS.forEach(add);
  if (S.user) {
    S.feed.forEach(function (v) {
      if (v.owner && (v.owner.id === S.user.id || v.owner.handle === S.user.handle)) add(v);
    });
  }
  return out;
}
function refreshProfile() {
  if (!S.user) return;
  if (!S.demo && S.token) {
    api('/v1/me').then(function (r) {
      S.user = r.data.user;
      S.credits.balance = r.data.creditBalance;
      paintProfile();
      loadCredits();
      /* The public-profile shape is the one that carries follower /
       * following counts + the account's video list. */
      return api('/v1/users/' + encodeURIComponent(S.user.handle));
    }).then(function (r) {
      if (r && r.data) {
        S.myProfile = r.data;
        if (S.user && r.data.user) {
          S.user.followersCount = r.data.user.followersCount;
          S.user.followingCount = r.data.user.followingCount;
        }
        paintProfile();
      }
    }).catch(function () { paintProfile(); });
  } else {
    paintProfile();
    loadCredits();
  }
}
function setProfileTab(tab) {
  S.profileTab = tab;
  $('profile-tab-videos').classList.toggle('active', tab === 'videos');
  $('profile-tab-shop').classList.toggle('active', tab === 'shop');
  $('profile-videos-pane').classList.toggle('hidden', tab !== 'videos');
  $('profile-shop-pane').classList.toggle('hidden', tab !== 'shop');
  if (tab === 'shop') renderProfileCredits();
}
function paintProfile() {
  var u = S.user;
  if (!u) return;
  var av = $('profile-avatar');
  av.textContent = initial(u.displayName);
  av.style.background = u.avatarBg || gradientFor(u.handle);
  $('profile-name').textContent = u.displayName;
  $('profile-handle').textContent = '@' + u.handle + (S.demo ? ' · demo' : '');
  $('profile-bio').textContent = u.bio || '';
  /* Kay 22:26: the creator level is DEMOTED to one small, quiet
   * line under the bio. No card, no strip, no hero placement. (It
   * still drives distribution in the backend, unchanged.) */
  $('profile-level-line').textContent = profileLevelLine(u);
  var badges = $('profile-badges');
  badges.innerHTML = '';
  userBadges(u).forEach(function (x) { badges.appendChild(el('span', 'badge', x)); });
  var videos = ownVideos();
  var followers = (S.myProfile && S.myProfile.user && S.myProfile.user.followersCount !== undefined)
    ? S.myProfile.user.followersCount : (u.followersCount || 0);
  var following = (S.myProfile && S.myProfile.user && S.myProfile.user.followingCount !== undefined)
    ? S.myProfile.user.followingCount : (u.followingCount || 0);
  S.profileCounts = { videos: videos.length, followers: followers, following: following };
  $('profile-video-count').textContent = fmtCount(videos.length);
  $('profile-followers-count').textContent = fmtCount(followers);
  $('profile-following-count').textContent = fmtCount(following);
  var grid = $('profile-grid');
  grid.innerHTML = '';
  videos.forEach(function (v) { grid.appendChild(profileVideoTile(v)); });
  $('profile-no-videos').classList.toggle('hidden', videos.length > 0);
  setProfileTab(S.profileTab || 'videos');
}
function openEditProfile() {
  if (!S.user) return;
  $('edit-name').value = S.user.displayName || '';
  $('edit-bio').value = S.user.bio || '';
  var m = $('edit-profile-msg'); m.textContent = ''; m.className = 'form-msg';
  show($('edit-profile-sheet'));
  updateBottomBar();
}
function closeEditProfile() { hide($('edit-profile-sheet')); updateBottomBar(); }
function saveEditProfile() {
  var name = $('edit-name').value.trim();
  var bio = $('edit-bio').value.trim();
  var msg = $('edit-profile-msg');
  if (!name) { msg.textContent = t('displayName'); msg.className = 'form-msg error'; return; }
  if (S.demo || !S.token) {
    S.user.displayName = name;
    S.user.bio = bio;
    paintProfile();
    closeEditProfile();
    toast(t('profileUpdated'));
    return;
  }
  api('/v1/me', { method: 'PATCH', body: { displayName: name, bio: bio } }).then(function (r) {
    if (r.data && r.data.user) S.user = Object.assign({}, S.user, r.data.user);
    paintProfile();
    closeEditProfile();
    toast(t('profileUpdated'));
  }).catch(function (e) { msg.textContent = localizedError(e); msg.className = 'form-msg error'; });
}
/* ---------------- games hub ----------------
 * Level gates mirror src/config.js creator levels: a game unlocks when
 * the user's creator level reaches unlockLevel. Game coins are a local
 * demo balance on this device — earned by playing, never bought, and
 * fully separate from credits (they never convert either way). Game
 * challenges post as cards into chat threads through the existing
 * message flow; for now they ride the local demo layer and are
 * labelled "demo" on the card, honestly. */
var GAMES = [
  { id: 'penalty', icon: '⚽', nameKey: 'gamePenalty', blurbKey: 'gamePenaltyBlurb', unlockLevel: 1 },
  { id: 'foodninja', icon: '🍔', nameKey: 'gameFood', blurbKey: 'gameFoodBlurb', unlockLevel: 2 },
  { id: 'volley', icon: '🏐', nameKey: 'gameVolley', blurbKey: 'gameVolleyBlurb', unlockLevel: 1, placeholder: true },
  { id: 'volfield', icon: '◈', nameKey: 'gameVolfield', blurbKey: 'gameVolfieldBlurb', unlockLevel: 1 },
  { id: 'pong', icon: '🏓', nameKey: 'gamePong', blurbKey: 'gamePongBlurb', unlockLevel: 3 },
  { id: 'poker', icon: '🃏', nameKey: 'gamePoker', blurbKey: 'gamePokerBlurb', unlockLevel: 4, placeholder: true }
];
function gameById(id) {
  for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i];
  return null;
}
function userLevel() { return levelForXp(S.user ? (S.user.xp || 0) : 0); }
function gameUnlocked(g) { return userLevel().level >= g.unlockLevel; }

/* ---- game coins (demo balance, on-device) ---- */
var coins = 100;
try {
  var savedCoins = localStorage.getItem('nocta.coins');
  if (savedCoins !== null) coins = Math.max(0, parseInt(savedCoins, 10) || 0);
} catch (e) { /* ignore */ }
function getCoins() { return coins; }
function addCoins(n) {
  coins = Math.max(0, coins + n);
  try { localStorage.setItem('nocta.coins', String(coins)); } catch (e) { /* ignore */ }
  renderCoins();
}
function renderCoins() {
  var cn = $('coins-n');
  if (cn) cn.textContent = String(coins);
}
var gameWinCount = 0;
try { gameWinCount = parseInt(localStorage.getItem('nocta.gamewins') || '0', 10) || 0; } catch (e) { /* ignore */ }
function bumpGameWins() {
  gameWinCount++;
  try { localStorage.setItem('nocta.gamewins', String(gameWinCount)); } catch (e) { /* ignore */ }
}

/* ---- hub rendering ---- */
function renderGamesHub() {
  var grid = $('games-grid');
  if (!grid) return;
  renderCoins();
  var lv = userLevel();
  var xp = S.user ? (S.user.xp || 0) : 0;
  var strip = $('games-level-strip');
  strip.innerHTML = '';
  var line = el('div');
  var lvb = el('b', null); lvb.innerHTML = LOOPI_ICONS.svg('star', 'ic ic-inline gold-ic'); line.appendChild(lvb);
  line.appendChild(document.createTextNode(' ' + t('level') + ' ' + lv.level + ' · ' + levelDisplayName(lv.name) + ' '));
  line.appendChild(document.createTextNode('· ' + xp + ' XP · ' + boostLabel(lv.reachBoost)));
  strip.appendChild(line);
  var locked = GAMES.filter(function (g) { return !gameUnlocked(g); });
  if (locked.length) {
    var nextG = locked[0];
    var needXp = levelForLevel(nextG.unlockLevel).minXp;
    strip.appendChild(el('div', null, t('nextUnlock') + ': ' + t(nextG.nameKey) + ' — ' + (needXp - xp) + ' ' + t('xpToGo')));
  }
  grid.innerHTML = '';
  GAMES.forEach(function (g) { grid.appendChild(gameCard(g)); });
  renderLeaderboard();
  var va = $('volley-art'); if (va) va.style.background = gradientFor('game_volley');
  var pa = $('poker-art'); if (pa) pa.style.background = gradientFor('game_poker');
}
function gameCard(g) {
  var unlocked = gameUnlocked(g);
  var card = el('div', 'game-card' + (unlocked ? '' : ' locked'));
  var art = el('div', 'game-art');
  art.innerHTML = LOOPI_ICONS.gameImg(g.id, 'game-png-lg');
  art.style.background = gradientFor('game_' + g.id);
  if (!unlocked) { var glk = el('span', 'game-lock'); glk.innerHTML = LOOPI_ICONS.svg('lock'); art.appendChild(glk); }
  if (g.placeholder) art.appendChild(el('span', 'kind-badge game-soon-tag', t('inBuild')));
  card.appendChild(art);
  var body = el('div', 'game-body');
  body.appendChild(el('div', 'game-name', t(g.nameKey)));
  body.appendChild(el('p', 'sub', t(g.blurbKey)));
  if (g.id === 'poker') body.appendChild(el('div', 'game-note', t('pokerFreeShort')));
  if (!unlocked) {
    var need = levelForLevel(g.unlockLevel).minXp;
    var have = S.user ? (S.user.xp || 0) : 0;
    body.appendChild(el('div', 'game-gate', t('unlocksAt') + ' ' + g.unlockLevel + ' · ' + (need - have) + ' ' + t('xpToGo')));
    var prog = el('div', 'progress');
    var bar = el('div', 'progress-bar');
    bar.style.width = Math.min(100, Math.max(3, Math.round(have / need * 100))) + '%';
    prog.appendChild(bar);
    body.appendChild(prog);
  }
  var row = el('div', 'game-actions');
  var play = el('button', unlocked ? 'primary' : 'ghost', unlocked ? t('play') : t('locked'));
  play.disabled = !unlocked;
  play.addEventListener('click', function () { openGame(g.id); });
  row.appendChild(play);
  var ch = el('button', 'ghost');
  ch.innerHTML = LOOPI_ICONS.svg('trophy', 'ic ic-inline gold-ic');
  ch.appendChild(document.createTextNode(' ' + t('challengeFriend')));
  ch.addEventListener('click', function () { openChallengePicker(g.id); });
  row.appendChild(ch);
  body.appendChild(row);
  card.appendChild(body);
  return card;
}
var DEMO_LEADERBOARD = [
  { creator: 'sofia', gameId: 'penalty', wins: 21 },
  { creator: 'mira', gameId: 'pong', wins: 17 },
  { creator: 'kenji', gameId: 'penalty', wins: 12 },
  { creator: 'theo', gameId: 'volley', wins: 6 }
];
function renderLeaderboard() {
  var wrap = $('games-leaderboard');
  if (!wrap) return;
  wrap.innerHTML = '';
  var head = el('div', 'lb-head');
  var lbT = el('span', null); lbT.innerHTML = LOOPI_ICONS.svg('trophy', 'ic ic-inline gold-ic'); lbT.appendChild(document.createTextNode(' ' + t('leaderboard'))); head.appendChild(lbT);
  head.appendChild(el('span', 'demo-tag', t('demoTag')));
  wrap.appendChild(head);
  var youRow = el('div', 'lb-row me');
  youRow.appendChild(el('span', 'mini-avatar', initial(S.user ? S.user.displayName : 'Y')));
  youRow.appendChild(el('span', 'lb-who', '@' + (S.user ? S.user.handle : 'you')));
  youRow.appendChild(el('span', 'lb-wins', gameWinCount + ' ' + t('wins')));
  wrap.appendChild(youRow);
  DEMO_LEADERBOARD.forEach(function (r, i) {
    var c = DEMO_CREATORS[r.creator];
    var row = el('div', 'lb-row');
    row.appendChild(el('span', 'lb-rank', '#' + (i + 1)));
    row.appendChild(el('span', 'mini-avatar', initial(c.displayName)));
    row.appendChild(el('span', 'lb-who', '@' + c.handle));
    var lbIc = el('span', 'lb-game-ic'); lbIc.innerHTML = LOOPI_ICONS.gameImg(r.gameId, 'game-png-sm'); row.appendChild(lbIc);
    row.appendChild(el('span', 'lb-wins', r.wins + ' ' + t('wins')));
    wrap.appendChild(row);
  });
}

/* ---- challenges (cards posted into chat threads) ---- */
var LOCAL_CHALLENGES = {}; // roomId -> [challenge messages] for server rooms
var pendingChallenge = null; // { gameId, scoreText }
function openChallengePicker(gameId, scoreText) {
  pendingChallenge = { gameId: gameId, scoreText: scoreText || null };
  var listEl = $('challenge-room-list');
  listEl.innerHTML = '';
  var rooms = (S.rooms && S.rooms.length) ? S.rooms : DEMO_ROOMS;
  rooms.forEach(function (room) {
    var b = el('button', 'room-row');
    b.appendChild(el('span', 'mini-avatar', initial(roomTitle(room))));
    var main = el('span', 'rr-main');
    main.appendChild(el('div', 'rr-name', roomTitle(room)));
    main.appendChild(el('div', 'rr-sub', roomSub(room)));
    b.appendChild(main);
    if (room.demo) b.appendChild(el('span', 'demo-tag', t('demoTag')));
    b.addEventListener('click', function () {
      hide($('challenge-picker'));
      postChallenge(room, pendingChallenge.gameId, pendingChallenge.scoreText);
      pendingChallenge = null;
    });
    listEl.appendChild(b);
  });
  show($('challenge-picker'));
}
function postChallenge(room, gameId, scoreText) {
  var m = {
    id: 'chal_' + Date.now(), type: 'challenge', gameId: gameId, demo: true,
    scoreText: scoreText || null, sender: S.user, mine: true, createdAt: Date.now()
  };
  if (room.demo || S.demo || !S.token) {
    if (!DEMO_MESSAGES[room.id]) DEMO_MESSAGES[room.id] = [];
    DEMO_MESSAGES[room.id].push(m);
  } else {
    if (!LOCAL_CHALLENGES[room.id]) LOCAL_CHALLENGES[room.id] = [];
    LOCAL_CHALLENGES[room.id].push(m);
  }
  toast(t('challengeSent'));
  enterChat(room);
}
function openGame(id) {
  var g = gameById(id);
  if (!g) return;
  if (!gameUnlocked(g)) {
    toast(t('unlocksAt') + ' ' + g.unlockLevel);
    showPanel('games');
    return;
  }
  showPanel('game-' + id);
  if (id === 'penalty') pkReset();
  if (id === 'pong') pongSetup();
}

/* ---- Penalty Kicks: best-of-5 shootout vs the keeper bot ----
 * SWIPE shooting and saving — pointer events throughout, so a mouse
 * click-drag is the same flick as a touch swipe.
 *
 * Shooting: you swipe across the goal mouth. The release point is
 * your aim, and the flick "throws" the ball a little past your
 * fingertip in proportion to its power. Weak swipe = soft, accurate
 * placed shot; full-power swipe = pace, but accuracy falls off as
 * power rises — worst near the posts and bar, which is exactly how
 * you sky one over or drag it wide. The keeper bot dives as before:
 * about a third of the time it reads the centroid of your previous
 * targets, otherwise it guesses with a corner-heavy weighting.
 *
 * Saving: when the bot shoots, you swipe to dive. The swipe's end
 * point is where your keeper throws himself; your REACTION time
 * sets the reach — commit late and the same dive covers less goal.
 * If you never swipe, he stays home with a short reach.
 *
 * Best of 5, then sudden death; mathematical elimination ends it
 * early. The pure mapping helpers below (power / aim-throw / scatter
 * / resolve) carry no DOM and are unit-tested in test/pk-swipe.test.js.
 * Goal coordinates: x 0..1 left→right, y 0..1 top→bottom. */
function pkZoneName(pt) {
  var col = pt.x < 1 / 3 ? 0 : (pt.x < 2 / 3 ? 1 : 2);
  var row = pt.y < 0.5 ? 0 : 1;
  return zoneName(row * 3 + col);
}
function pkClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function pkWeightedVal(values, weights) {
  var sum = 0, i;
  for (i = 0; i < weights.length; i++) sum += weights[i];
  var r = Math.random() * sum;
  for (i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return values[i]; }
  return values[values.length - 1];
}
/* flick strength 0..1 from normalised distance + release speed */
function pkPowerFromSwipe(distN, speedPxMs) {
  var d = pkClamp(distN / 0.8, 0, 1);
  var s = pkClamp(speedPxMs / 1.5, 0, 1);
  return pkClamp(0.55 * d + 0.45 * s, 0, 1);
}
/* scatter around the aim: grows with power² and near the frame */
function pkScatter(aim, power, rng) {
  rng = rng || Math.random;
  var edge = Math.max(Math.abs(aim.x - 0.5) * 2, Math.abs(aim.y - 0.5) * 2);
  var sigma = (0.012 + power * power * 0.11) * (0.7 + 0.6 * edge);
  var tri = function () { return rng() + rng() - 1; }; // triangular -1..1
  return { x: aim.x + tri() * sigma * 1.8, y: aim.y + tri() * sigma * 1.8 };
}
/* full shot resolution: { power, aim, target, result } */
function pkShotTarget(swipe, keeper, rng) {
  var dx = swipe.ex - swipe.sx, dy = swipe.ey - swipe.sy;
  var dist = Math.sqrt(dx * dx + dy * dy);
  var dtMs = Math.max(1, swipe.dtMs || 1);
  var power = pkPowerFromSwipe(dist / swipe.rectH, dist / dtMs);
  if (dist < 6) power = Math.min(power, 0.3); // a tap is a placed chip, never a rocket
  var aim = { x: swipe.ex / swipe.rectW, y: swipe.ey / swipe.rectH };
  if (dist > 4) { // the flick throws the ball a touch past the fingertip
    aim.x += (dx / dist) * power * 0.10;
    aim.y += (dy / dist) * power * 0.10;
  }
  var target = pkScatter(aim, power, rng);
  var result;
  if (target.x < 0 || target.x > 1 || target.y < 0 || target.y > 1) {
    result = 'miss';
  } else {
    var reach = 1.2 - 0.5 * power; // rockets give the keeper no time to get there
    var rx = 0.17 * reach, ry = 0.33 * reach;
    var ex = (target.x - keeper.x) / rx, ey = (target.y - keeper.y) / ry;
    result = (ex * ex + ey * ey <= 1) ? 'saved' : 'goal';
  }
  return { power: power, aim: aim, target: target, result: result };
}
/* dive reach multiplier from reaction delay (ms after the run-up) */
function pkDiveReach(delayMs) {
  return pkClamp(1.05 - Math.max(0, delayMs - 200) / 1600, 0.5, 1);
}
/* does a dive centred at `dive` with reach multiplier cover `shot`? */
function pkResolveSave(shot, dive, reachMul) {
  var rx = 0.19 * reachMul, ry = 0.36 * reachMul;
  var dx = (shot.x - dive.x) / rx, dy = (shot.y - dive.y) / ry;
  return dx * dx + dy * dy <= 1;
}

var pk = null;
function pkKeeperDivePoint() {
  var pts = pk.youTargets;
  if (pts.length && Math.random() < 0.35) {
    var cx = 0, cy = 0;
    pts.forEach(function (p) { cx += p.x; cy += p.y; });
    return {
      x: pkClamp(cx / pts.length + (Math.random() - 0.5) * 0.12, 0.06, 0.94),
      y: pkClamp(cy / pts.length + (Math.random() - 0.5) * 0.12, 0.08, 0.92)
    };
  }
  return {
    x: pkClamp(pkWeightedVal([0.13, 0.5, 0.87], [3, 1.4, 3]) + (Math.random() - 0.5) * 0.1, 0.05, 0.95),
    y: pkClamp(pkWeightedVal([0.2, 0.8], [3, 4]) + (Math.random() - 0.5) * 0.1, 0.06, 0.94)
  };
}
function pkBotShotPoint() {
  function roll() {
    return {
      x: pkClamp(pkWeightedVal([0.1, 0.5, 0.9], [4, 1, 4]) + (Math.random() - 0.5) * 0.08, 0.03, 0.97),
      y: pkClamp(pkWeightedVal([0.18, 0.82], [4.2, 4.8]) + (Math.random() - 0.5) * 0.08, 0.05, 0.95)
    };
  }
  var p = roll();
  var last = pk.botTargets[pk.botTargets.length - 1];
  if (last && Math.abs(p.x - last.x) < 0.25 && Math.abs(p.y - last.y) < 0.3 && Math.random() < 0.6) p = roll();
  return p;
}
function pkReset() {
  if (pk && pk.saveTimer) clearTimeout(pk.saveTimer);
  pk = {
    phase: 'shoot', you: 0, bot: 0, youKicks: [], botKicks: [],
    youTargets: [], botTargets: [], over: false, busy: false, finalText: null,
    swipe: null, shotPt: null, phaseAt: 0, saveTimer: null
  };
  hide($('pk-result'));
  hide($('pk-power'));
  pkBuildStage();
  $('pk-msg').textContent = t('pkYouFirst');
  pkPaint();
}
function pkBuildStage() {
  var goal = $('pk-goal');
  goal.innerHTML = '';
  pk.keeperEl = el('div', 'pk-keeper'); pk.keeperEl.innerHTML = LOOPI_ICONS.svg('person', 'pk-keeper-ic');
  pk.ballEl = el('div', 'pk-ball'); pk.ballEl.innerHTML = LOOPI_ICONS.gameImg('penalty', 'pk-ball-png');
  pk.aimEl = el('div', 'pk-aim hidden');
  goal.appendChild(pk.keeperEl);
  goal.appendChild(pk.ballEl);
  goal.appendChild(pk.aimEl);
  pkPlace(pk.keeperEl, { x: 0.5, y: 0.66 }, false);
  pkPlace(pk.ballEl, { x: 0.5, y: 0.9 }, false);
}
function pkPlace(node, pt, animate) {
  node.style.transition = animate
    ? 'left .45s cubic-bezier(.25,.8,.35,1), top .45s cubic-bezier(.25,.8,.35,1), transform .45s ease'
    : 'none';
  node.style.left = (pt.x * 100) + '%';
  node.style.top = (pt.y * 100) + '%';
  var tilt = pt.x < 0.38 ? -24 : (pt.x > 0.62 ? 24 : 0);
  node.style.transform = 'translate(-50%,-50%) rotate(' + (node === pk.keeperEl ? tilt : 0) + 'deg)';
}
function pkPaint() {
  if (!pk) return;
  $('pk-score').textContent = t('youWord') + ' ' + pk.you + ' — ' + pk.bot + ' ' + t('botWord');
  var dots = $('pk-dots');
  dots.innerHTML = '';
  var mk = function (arr) {
    return arr.map(function (scored) { return scored ? '●' : '○'; }).join(' ') || '·';
  };
  dots.appendChild(el('span', null, t('youWord') + ' ' + mk(pk.youKicks)));
  dots.appendChild(el('span', null, t('botWord') + ' ' + mk(pk.botKicks)));
  var prompt = $('pk-prompt');
  if (pk.over) prompt.textContent = t('pkFullTime');
  else if (pk.phase === 'shoot') {
    var n = pk.youKicks.length + 1;
    prompt.textContent = n > 5 ? t('pkYourShotSD') : t('pkYourShotKick').replace('{n}', n);
  } else {
    var m = pk.botKicks.length + 1;
    prompt.textContent = m > 5 ? t('pkBotShootsSD') : t('pkBotShootsKick').replace('{n}', m);
  }
}
function pkMissText(target) {
  if (target.y < 0) return t('pkMissOver');
  if (target.x < 0) return t('pkMissLeft');
  if (target.x > 1) return t('pkMissRight');
  return t('pkMissTurf');
}
function pkAfterKick() {
  pkPaint();
  setTimeout(function () {
    if (!pk || pk.over) return;
    pk.busy = false;
    if (pkDecided()) { pkFinish(); return; }
    pk.phase = pk.phase === 'shoot' ? 'save' : 'shoot';
    pkBuildStage();
    if (pk.phase === 'save') {
      $('pk-msg').textContent = 'Bot shoots — swipe to dive as he strikes!';
      pkBeginSave();
    } else {
      $('pk-msg').textContent = 'Your shot — swipe into a corner.';
    }
    pkPaint();
  }, 1150);
}
function pkShoot(swipe) {
  var keeper = pkKeeperDivePoint();
  var res = pkShotTarget(swipe, keeper);
  pk.youTargets.push(res.target);
  pkPlace(pk.keeperEl, keeper, true);
  if (res.result === 'goal') pkPlace(pk.ballEl, res.target, true);
  else if (res.result === 'saved') pkPlace(pk.ballEl, keeper, true);
  else pkPlace(pk.ballEl, { x: pkClamp(res.target.x, -0.08, 1.08), y: pkClamp(res.target.y, -0.08, 1.08) }, true);
  var scored = res.result === 'goal';
  pk.youKicks.push(scored);
  if (scored) pk.you++;
  var pct = Math.round(res.power * 100);
  if (res.result === 'goal') {
    $('pk-msg').textContent = t('pkGoalMsg').replace('{zone}', pkZoneName(res.target)).replace('{pct}', pct) +
      (res.power > 0.75 ? t('pkGoalSuffixRocket') : t('pkGoalSuffixPlaced'));
  } else if (res.result === 'saved') {
    $('pk-msg').textContent = t('pkSavedMsg').replace('{zone}', pkZoneName(res.target)).replace('{pct}', pct);
  } else {
    $('pk-msg').textContent = pkMissText(res.target) + t('pkMissPowerSuffix').replace('{pct}', pct);
  }
  pkAfterKick();
}
var PK_RUNUP_MS = 350;   // the bot's telegraphed run-up before he strikes
var PK_DIVE_WINDOW_MS = 1500;
function pkBeginSave() {
  pk.shotPt = pkBotShotPoint();
  pk.phaseAt = Date.now();
  if (pk.saveTimer) clearTimeout(pk.saveTimer);
  pk.saveTimer = setTimeout(function () {
    if (!pk || pk.over || pk.busy || pk.phase !== 'save') return;
    pk.busy = true;
    // never swiped: keeper stays home with half reach
    pkResolveDive({ x: 0.5, y: 0.7 }, 0.5, t('pkYouFroze'));
  }, PK_RUNUP_MS + PK_DIVE_WINDOW_MS);
}
function pkResolveDive(divePt, reachMul, leadText) {
  if (pk.saveTimer) { clearTimeout(pk.saveTimer); pk.saveTimer = null; }
  var shot = pk.shotPt;
  var saved = pkResolveSave(shot, divePt, reachMul);
  pk.botTargets.push(shot);
  pkPlace(pk.keeperEl, divePt, true);
  pkPlace(pk.ballEl, saved ? divePt : shot, true);
  pk.botKicks.push(!saved);
  if (!saved) pk.bot++;
  $('pk-msg').textContent = (leadText || '') + (saved
    ? t('pkYouSavedIt').replace('{zone}', pkZoneName(shot))
    : t('pkBotScores').replace('{zone}', pkZoneName(shot)));
  pkAfterKick();
}
/* ---- swipe input on the goal (pointer events: touch ≡ mouse) ---- */
function pkGoalPoint(e) {
  var rect = $('pk-goal').getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top, rectW: rect.width, rectH: rect.height };
}
function pkPowerUi(power) {
  var wrap = $('pk-power'), fill = $('pk-power-fill');
  if (!wrap || !fill) return;
  show(wrap);
  fill.style.width = Math.round(power * 100) + '%';
  fill.className = power > 0.8 ? 'hot' : (power > 0.5 ? 'warm' : '');
  fill.id = 'pk-power-fill';
}
function pkPointerDown(e) {
  if (!pk || pk.over || pk.busy) return;
  var p = pkGoalPoint(e);
  pk.swipe = { sx: p.x, sy: p.y, lx: p.x, ly: p.y, t0: Date.now(), rectW: p.rectW, rectH: p.rectH };
  try { $('pk-goal').setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
  if (pk.phase === 'shoot' && pk.aimEl) {
    pk.aimEl.classList.remove('hidden');
    pk.aimEl.style.left = (p.x / p.rectW * 100) + '%';
    pk.aimEl.style.top = (p.y / p.rectH * 100) + '%';
  }
  pkPowerUi(0);
  e.preventDefault();
}
function pkPointerMove(e) {
  if (!pk || !pk.swipe) return;
  var p = pkGoalPoint(e);
  pk.swipe.lx = p.x; pk.swipe.ly = p.y;
  var dx = p.x - pk.swipe.sx, dy = p.y - pk.swipe.sy;
  var dist = Math.sqrt(dx * dx + dy * dy);
  var dt = Math.max(1, Date.now() - pk.swipe.t0);
  pkPowerUi(pkPowerFromSwipe(dist / pk.swipe.rectH, dist / dt));
  if (pk.phase === 'shoot' && pk.aimEl) {
    pk.aimEl.style.left = (p.x / p.rectW * 100) + '%';
    pk.aimEl.style.top = (p.y / p.rectH * 100) + '%';
  }
}
function pkPointerUp(e) {
  if (!pk || !pk.swipe) return;
  var sw = pk.swipe;
  pk.swipe = null;
  hide($('pk-power'));
  if (pk.aimEl) pk.aimEl.classList.add('hidden');
  if (pk.over || pk.busy) return;
  var p = pkGoalPoint(e);
  var swipe = {
    sx: sw.sx, sy: sw.sy, ex: p.x, ey: p.y,
    dtMs: Math.max(16, Date.now() - sw.t0), rectW: sw.rectW, rectH: sw.rectH
  };
  pk.busy = true;
  if (pk.phase === 'shoot') {
    pkShoot(swipe);
  } else {
    // reaction is timed from the end of the bot's run-up telegraph
    var delay = Date.now() - pk.phaseAt - PK_RUNUP_MS;
    pkResolveDive({ x: swipe.ex / swipe.rectW, y: swipe.ey / swipe.rectH }, pkDiveReach(delay), '');
  }
}
function pkDecided() {
  var y = pk.youKicks.length, b = pk.botKicks.length;
  if (y >= 5 && b >= 5) {
    // Sudden death: only call it once both sides have taken the same
    // number of kicks — never mid-round.
    if (y === b) return pk.you !== pk.bot;
    return false;
  }
  var youLeft = Math.max(0, 5 - y), botLeft = Math.max(0, 5 - b);
  if (pk.you > pk.bot + botLeft) return true;
  if (pk.bot > pk.you + youLeft) return true;
  return false;
}
function pkFinish() {
  pk.over = true;
  if (pk.saveTimer) { clearTimeout(pk.saveTimer); pk.saveTimer = null; }
  var won = pk.you > pk.bot;
  var reward = won ? 30 : 5;
  addCoins(reward);
  if (won) bumpGameWins();
  pk.finalText = t('gamePenalty') + ' — ' + t('youWord') + ' ' + pk.you + ' : ' + pk.bot + ' ' + t('botWord') + '. ' + t('beatThat');
  $('pk-result-text').textContent = (won ? t('pkResultWinText') : t('pkResultLoseText'))
    .replace('{a}', pk.you).replace('{b}', pk.bot).replace('{r}', reward);
  show($('pk-result'));
  pkBuildStage();
  pkPaint();
}

/* ---- Ping Pong: canvas duel vs the bot, first to 7 ----
 * Your paddle (bottom) follows mouse / touch. The bot (top) tracks
 * the ball with a capped speed that grows every time you score and
 * with long rallies — hit angles come from where the ball strikes
 * your paddle, and the ball speeds up on every return. */
var pong = null;
function pongSetup() {
  var cv = $('pong-canvas');
  if (!cv) return;
  if (pong && pong.raf) cancelAnimationFrame(pong.raf);
  pong = {
    cv: cv, ctx: cv.getContext('2d'), W: cv.width, H: cv.height,
    pw: 74, ph: 10, px: cv.width / 2 - 37, bx: cv.width / 2 - 37,
    ball: { x: cv.width / 2, y: cv.height / 2, vx: 2, vy: 3.4, speed: 4.2 },
    you: 0, bot: 0, running: false, over: false, raf: null, targetX: null,
    rallyHits: 0, finalText: null
  };
  $('pong-msg').textContent = t('pongRules');
  $('pong-start').textContent = t('startGame');
  pongDraw();
}
function pongStart() {
  if (!pong) pongSetup();
  if (pong.over) pongSetup();
  if (!pong || pong.running) return;
  pong.running = true;
  pongLoop();
}
function pongLoop() {
  if (!pong || !pong.running) return;
  if ($('panel-game-pong').classList.contains('hidden')) { pong.running = false; return; }
  pongStep();
  pongDraw();
  pong.raf = requestAnimationFrame(pongLoop);
}
function pongClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function pongStep() {
  var b = pong.ball;
  if (pong.targetX !== null) pong.px = pongClamp(pong.targetX - pong.pw / 2, 0, pong.W - pong.pw);
  var botSpeed = Math.min(6.2, 2.7 + pong.you * 0.35 + pong.rallyHits * 0.03);
  var bc = pong.bx + pong.pw / 2;
  if (b.vy < 0) {
    pong.bx = pongClamp(pong.bx + pongClamp(b.x - bc, -botSpeed, botSpeed), 0, pong.W - pong.pw);
  } else {
    pong.bx = pongClamp(pong.bx + pongClamp(pong.W / 2 - bc, -1.2, 1.2), 0, pong.W - pong.pw);
  }
  b.x += b.vx; b.y += b.vy;
  if (b.x < 6) { b.x = 6; b.vx = Math.abs(b.vx); }
  if (b.x > pong.W - 6) { b.x = pong.W - 6; b.vx = -Math.abs(b.vx); }
  var py = pong.H - 26, by = 16;
  if (b.vy > 0 && b.y + 6 >= py && b.y + 6 <= py + pong.ph + 10 &&
      b.x >= pong.px - 6 && b.x <= pong.px + pong.pw + 6) pongBounce(true);
  if (b.vy < 0 && b.y - 6 <= by + pong.ph && b.y - 6 >= by - 10 &&
      b.x >= pong.bx - 6 && b.x <= pong.bx + pong.pw + 6) pongBounce(false);
  if (b.y > pong.H + 12) pongPoint(false);
  else if (b.y < -12) pongPoint(true);
}
function pongBounce(playerHit) {
  var c = playerHit ? (pong.px + pong.pw / 2) : (pong.bx + pong.pw / 2);
  var rel = pongClamp((pong.ball.x - c) / (pong.pw / 2), -1, 1);
  pong.ball.speed = Math.min(9, pong.ball.speed * 1.05);
  pong.ball.vx = rel * pong.ball.speed * 0.85;
  pong.ball.vy = (playerHit ? -1 : 1) * pong.ball.speed * 0.72;
  pong.ball.y = playerHit ? (pong.H - 26 - 7) : (16 + pong.ph + 7);
  pong.rallyHits++;
}
function pongPoint(playerScored) {
  if (playerScored) pong.you++; else pong.bot++;
  pong.rallyHits = 0;
  if (pong.you >= 7 || pong.bot >= 7) { pongFinish(); return; }
  pong.ball.x = pong.W / 2; pong.ball.y = pong.H / 2;
  pong.ball.speed = 4.2;
  pong.ball.vx = (Math.random() * 2 - 1) * 2;
  pong.ball.vy = playerScored ? -3.4 : 3.4; // serve toward the player who just conceded
}
function pongFinish() {
  pong.over = true;
  pong.running = false;
  var won = pong.you > pong.bot;
  var reward = won ? 30 : 5;
  addCoins(reward);
  if (won) bumpGameWins();
  pong.finalText = t('gamePong') + ' — ' + t('youWord') + ' ' + pong.you + ' : ' + pong.bot + ' ' + t('botWord') + '. ' + t('beatThat');
  $('pong-msg').textContent = (won ? t('pongResultWinText') : t('pongResultLoseText')).replace('{a}', pong.you).replace('{b}', pong.bot).replace('{r}', reward);
  $('pong-start').textContent = t('playAgain');
  pongDraw();
}
function pongDraw() {
  if (!pong || !pong.ctx) return;
  var ctx = pong.ctx, W = pong.W, H = pong.H;
  var pg = ctx.createLinearGradient(0, 0, 0, H);
  pg.addColorStop(0, '#a5dcf7'); pg.addColorStop(0.55, '#d8f2fd'); pg.addColorStop(1, '#fdf0d2');
  ctx.fillStyle = pg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(37,52,63,.18)';
  ctx.setLineDash([6, 8]);
  ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = '900 44px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(31,110,200,.4)';
  ctx.textAlign = 'center';
  ctx.fillText(String(pong.bot), W / 2, H / 2 - 26);
  ctx.fillStyle = 'rgba(255,107,74,.45)';
  ctx.fillText(String(pong.you), W / 2, H / 2 + 62);
  ctx.fillStyle = '#1f7ae0';
  ctx.fillRect(pong.bx, 16, pong.pw, pong.ph);
  ctx.fillStyle = '#ff6b4a';
  ctx.fillRect(pong.px, H - 26, pong.pw, pong.ph);
  ctx.fillStyle = '#25343f';
  ctx.beginPath();
  ctx.arc(pong.ball.x, pong.ball.y, 6, 0, Math.PI * 2);
  ctx.fill();
  if (pong.over) {
    ctx.fillStyle = 'rgba(255,251,240,.82)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#25343f';
    ctx.font = '900 26px system-ui, sans-serif';
    ctx.fillText(pong.you > pong.bot ? t('pongWin') : t('pongLose'), W / 2, H / 2 - 8);
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.fillText(pong.you + ' — ' + pong.bot, W / 2, H / 2 + 22);
  }
}

/* ---------------- wiring + boot ---------------- */
function wire() {
  wireTabs();
  wireBottomBar();
  $('auth-tab-login').addEventListener('click', function () { setAuthMode('login'); });
  $('auth-tab-register').addEventListener('click', function () { setAuthMode('register'); });
  $('auth-submit').addEventListener('click', submitAuth);
  var fkLink = $('auth-forgot-link');
  if (fkLink) fkLink.addEventListener('click', function () {
    var rp = $('reset-panel');
    if (rp) { rp.classList.toggle('hidden'); resetMsg(''); }
  });
  var rsSend = $('reset-send'); if (rsSend) rsSend.addEventListener('click', sendResetCode);
  var rsSubmit = $('reset-submit'); if (rsSubmit) rsSubmit.addEventListener('click', submitReset);
  var rsBack = $('reset-back'); if (rsBack) rsBack.addEventListener('click', function () { hide($('reset-panel')); });
  var chpwBtn = $('chpw-btn'); if (chpwBtn) chpwBtn.addEventListener('click', submitChangePassword);
  $('auth-password').addEventListener('keydown', function (e) { if (e.key === 'Enter') submitAuth(); });
  $('demo-browse-btn').addEventListener('click', browseDemo);
  $('logout-btn').addEventListener('click', logout);
  $('onboard-done').addEventListener('click', finishOnboarding);
  $('onboard-skip').addEventListener('click', function () { S.pickedInterests = []; finishOnboarding(); });

  $('search-input').addEventListener('input', buildExploreGrid);

  $('create-close').addEventListener('click', closeCreate);
  $('upload-file').addEventListener('change', handleUploadFile);
  $('upload-post-btn').addEventListener('click', submitUpload);
  $('upload-music-row').addEventListener('click', openMusicSheet);
  $('music-close').addEventListener('click', closeMusicSheet);
  var segs = document.querySelectorAll('#gen-duration .seg');
  for (var i = 0; i < segs.length; i++) {
    segs[i].addEventListener('click', function () {
      for (var j = 0; j < segs.length; j++) segs[j].classList.remove('active');
      this.classList.add('active');
      S.genDuration = Number(this.getAttribute('data-sec'));
    });
  }
  $('gen-btn').addEventListener('click', submitGenerate);
  $('gen-topup').addEventListener('click', function () { openCreditsPopup(0, true); });
  $('credits-close').addEventListener('click', closeCreditsPopup);

  $('chat-bubble').addEventListener('click', function () {
    if (S.overlayOpen) closeOverlay(); else openOverlay();
  });
  $('overlay-close').addEventListener('click', closeOverlay);
  $('overlay-send').addEventListener('click', sendOverlayMessage);
  $('overlay-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') sendOverlayMessage(); });

  $('notif-read-all').addEventListener('click', function () {
    markAllNotifsRead();
    renderNotifications();
  });
  $('creator-follow-btn').addEventListener('click', creatorFollowToggle);
  $('creator-message-btn').addEventListener('click', messageCreator);
  $('creator-share-btn').addEventListener('click', function () {
    if (S.creatorProfile) shareProfile(S.creatorProfile.user);
  });
  $('creator-followers-stat').addEventListener('click', function () {
    if (S.creatorProfile) openPeopleList('followers', S.creatorProfile.user, S.creatorProfile.user.followersCount);
  });
  $('creator-following-stat').addEventListener('click', function () {
    if (S.creatorProfile) openPeopleList('following', S.creatorProfile.user, S.creatorProfile.user.followingCount);
  });
  $('creator-videos-stat').addEventListener('click', function () {
    var g = $('creator-grid');
    if (g) g.scrollIntoView({ block: 'start' });
  });
  $('profile-followers-stat').addEventListener('click', function () {
    if (S.user) openPeopleList('followers', S.user, S.profileCounts ? S.profileCounts.followers : 0);
  });
  $('profile-following-stat').addEventListener('click', function () {
    if (S.user) openPeopleList('following', S.user, S.profileCounts ? S.profileCounts.following : 0);
  });
  $('profile-videos-stat').addEventListener('click', function () { setProfileTab('videos'); });
  $('profile-tab-videos').addEventListener('click', function () { setProfileTab('videos'); });
  $('profile-tab-shop').addEventListener('click', function () { setProfileTab('shop'); });
  $('edit-profile-btn').addEventListener('click', openEditProfile);
  $('profile-share-btn').addEventListener('click', function () { shareProfile(S.user); });
  $('edit-profile-close').addEventListener('click', closeEditProfile);
  $('edit-profile-cancel').addEventListener('click', closeEditProfile);
  $('edit-profile-save').addEventListener('click', saveEditProfile);
  $('people-close').addEventListener('click', closePeopleList);
  $('bio-unlock-btn').addEventListener('click', function () {
    var b = bioBridge();
    if (b && b.unlock) { try { b.unlock(); } catch (e) { toast(t('bioFailed')); } }
  });
  $('bio-toggle').addEventListener('change', function () {
    var b = bioBridge();
    var msg = $('bio-msg');
    if (!b) return;
    if (this.checked) {
      if (S.token && b.enable) { try { b.enable(S.token); } catch (e) { this.checked = false; if (msg) msg.textContent = t('bioFailed'); } }
      else { this.checked = false; if (msg) msg.textContent = t('bioFailed'); }
    } else if (b.disable) {
      try { b.disable(); } catch (e) { /* ignore */ }
      if (S.token) saveToken(S.token);
      if (msg) { msg.textContent = t('bioDisabled'); msg.className = 'form-msg'; }
    }
  });
  var privRadios = document.querySelectorAll('input[name="privacy"]');
  for (var pr = 0; pr < privRadios.length; pr++) {
    privRadios[pr].addEventListener('change', function () { if (this.checked) savePrivacy(this.value); });
  }

  $('delete-account-btn').addEventListener('click', openDeleteAccount);
  $('delete-close').addEventListener('click', closeDeleteAccount);
  $('delete-cancel').addEventListener('click', closeDeleteAccount);
  $('delete-confirm').addEventListener('click', submitDeleteAccount);
  $('delete-password').addEventListener('keydown', function (e) { if (e.key === 'Enter') submitDeleteAccount(); });

  $('comments-close').addEventListener('click', function () { hide($('comments-sheet')); updateBottomBar(); });
  $('comment-send').addEventListener('click', sendComment);
  $('comment-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') sendComment(); });

  $('room-create-btn').addEventListener('click', createRoom);
  $('room-type').addEventListener('change', function () {
    $('room-password-row').style.opacity = this.value === 'private' ? '1' : '.45';
  });
  $('chat-back').addEventListener('click', function () {
    stopVoiceRecording(false); stopVoicePlayback(); stopVoiceTranscriptPoll();
    showPanel('inbox'); loadRooms();
  });
  $('chat-send').addEventListener('click', sendChatMessage);
  $('chat-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') sendChatMessage(); });
  $('chat-share-btn').addEventListener('click', toggleSharePicker);
  $('chat-mic-btn').addEventListener('click', startVoiceRecording);
  $('voice-rec-cancel').addEventListener('click', function () { stopVoiceRecording(false); });
  $('voice-rec-send').addEventListener('click', function () { stopVoiceRecording(true); });

  $('go-live-btn').addEventListener('click', goLive);
  var lrEnd = $('lr-end-btn'); if (lrEnd) lrEnd.addEventListener('click', endLive);
  $('live-back').addEventListener('click', function () {
    stopLiveChatPolling();
    stopLiveVideo();
    closeGiftShelf();
    showPanel('live'); loadLive();
  });
  $('lr-chat-send').addEventListener('click', sendLiveChat);
  $('lr-gift-btn').addEventListener('click', openGiftShelf);
  $('gift-close').addEventListener('click', closeGiftShelf);
  $('lr-chat-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') sendLiveChat(); });
  var tips = document.querySelectorAll('.tip-btn');
  for (var k = 0; k < tips.length; k++) {
    tips[k].addEventListener('click', function () { tip(Number(this.getAttribute('data-tip'))); });
  }

  var backs = document.querySelectorAll('.game-back');
  for (var b = 0; b < backs.length; b++) {
    backs[b].addEventListener('click', function () { showPanel('games'); });
  }
  $('pk-again').addEventListener('click', pkReset);
  $('pk-challenge').addEventListener('click', function () {
    openChallengePicker('penalty', pk ? pk.finalText : null);
  });
  var pkGoalEl = $('pk-goal');
  pkGoalEl.addEventListener('pointerdown', pkPointerDown);
  pkGoalEl.addEventListener('pointermove', pkPointerMove);
  pkGoalEl.addEventListener('pointerup', pkPointerUp);
  pkGoalEl.addEventListener('pointercancel', pkPointerUp);
  $('pong-start').addEventListener('click', pongStart);
  $('pong-challenge').addEventListener('click', function () {
    openChallengePicker('pong', pong ? pong.finalText : null);
  });
  $('volley-challenge').addEventListener('click', function () { openChallengePicker('volley'); });
  $('poker-challenge').addEventListener('click', function () { openChallengePicker('poker'); });
  $('challenge-cancel').addEventListener('click', function () {
    pendingChallenge = null;
    hide($('challenge-picker'));
  });
  var cv = $('pong-canvas');
  var pongPointer = function (e) {
    if (!pong) return;
    var rect = cv.getBoundingClientRect();
    pong.targetX = (e.clientX - rect.left) * (pong.W / rect.width);
  };
  cv.addEventListener('pointermove', pongPointer);
  cv.addEventListener('pointerdown', function (e) {
    pongPointer(e);
    if (pong && !pong.running && !pong.over) pongStart();
  });
}
function restoreSession() {
  if (!S.token) { showScreen('screen-auth'); paintBioUnlockButton(); return; }
  api('/v1/me').then(function (r) {
    S.user = r.data.user;
    S.credits.balance = r.data.creditBalance;
    S.demo = false;
    var firstRun = !(S.user.interests && S.user.interests.length);
    /* Sliding renewal for the stay-signed-in path: if this token is
     * the PERSISTED localStorage copy, rotate it (the server cuts
     * the old one to a short grace window, so even a lost response
     * is not a logout) and store the fresh long-lived token — an
     * active user therefore never hits the 90-day expiry mid-use.
     * A memory-only token came from the biometric unseal: it is NOT
     * rotated, because the Keystore copy must stay the token it
     * sealed; when it finally expires, the password form is the
     * designed fallback. */
    var persisted = false;
    try { persisted = localStorage.getItem('nocta.token') === S.token; } catch (e) { /* ignore */ }
    if (!persisted) { enterApp(firstRun); return; }
    api('/v1/session/refresh', { method: 'POST' }).then(function (rr) {
      if (rr.data && rr.data.token) saveToken(rr.data.token);
    }).catch(function () { /* keep the current token; grace covers us */ })
      .then(function () { enterApp(firstRun); });
  }).catch(function () {
    saveToken(null);
    showScreen('screen-auth');
    paintBioUnlockButton();
  });
}
function boot() {
  wire();
  applyI18n();
  setAuthMode('login');
  renderInterestChips();
  paintBioUnlockButton();
  if (S.token) {
    /* Stay signed in: a persisted long-lived session restores
     * straight into the app — no re-login on reopen. */
    restoreSession();
  } else if (bioAvailable() && bioEnabled() && !S.bioUnlockStarted) {
    /* Biometric path: no local token exists by design; ask the
     * native side to unseal it. Failure lands on the password form. */
    S.bioUnlockStarted = true;
    showScreen('screen-auth');
    paintBioUnlockButton();
    var b = bioBridge();
    if (b && b.unlock) {
      setTimeout(function () { try { b.unlock(); } catch (e) { /* password fallback stays */ } }, 350);
    }
  } else {
    showScreen('screen-auth');
  }
}
document.addEventListener('DOMContentLoaded', boot);
