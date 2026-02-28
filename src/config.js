/* ═══════════════════════════════════════════════════
   Road Fury: Kerala Rush — Game Configuration
   ═══════════════════════════════════════════════════ */

export const GAME_CONFIG = {
    // ── Track ──
    TRACK_LENGTH: 3000,          // total race distance
    ROAD_WIDTH: 12,
    LANE_COUNT: 4,
    SEGMENT_LENGTH: 20,
    RENDER_DISTANCE: 60,         // how many segments ahead to render

    // ── Player Bikes ──
    BIKES: {
        rat: {
            name: 'Rat Bike',
            maxSpeed: 160,
            acceleration: 0.15,
            braking: 0.3,
            handling: 0.85,
            model: 'rat',
        },
        sports: {
            name: 'Sports Bike',
            maxSpeed: 220,
            acceleration: 0.22,
            braking: 0.25,
            handling: 0.55,
            model: 'sports',
            locked: true,
        }
    },

    // ── Difficulty Presets ──
    DIFFICULTY: {
        easy: {
            botSpeedMultiplier: 0.75,
            obstacleSpawnRate: 0.6,
            botAggressionMultiplier: 0.5,
            trafficDensity: 0.5,
        },
        medium: {
            botSpeedMultiplier: 0.9,
            obstacleSpawnRate: 1.0,
            botAggressionMultiplier: 1.0,
            trafficDensity: 1.0,
        },
        hard: {
            botSpeedMultiplier: 1.05,
            obstacleSpawnRate: 1.4,
            botAggressionMultiplier: 1.5,
            trafficDensity: 1.5,
        }
    },

    // ── Map Configs ──
    MAPS: {
        indus: {
            name: 'Indus Valley',
            curveIntensity: 0.2,
            obstacleDensity: 0.6,
            trafficDensity: 0.5,
            skyColor: 0x87ceeb,
            groundColor: 0x3a7d44,
            roadColor: 0x444444,
            fogColor: 0x87ceeb,
            fogNear: 100,
            fogFar: 400,
            ambientLight: 0.7,
        },
        koratty: {
            name: 'Koratty Bypass',
            curveIntensity: 0.5,
            obstacleDensity: 1.0,
            trafficDensity: 1.0,
            skyColor: 0xffa94d,
            groundColor: 0x5a4427,
            roadColor: 0x333333,
            fogColor: 0xd4905c,
            fogNear: 80,
            fogFar: 350,
            ambientLight: 0.6,
        },
        angamaly: {
            name: 'Angamaly Junction',
            curveIntensity: 0.8,
            obstacleDensity: 1.4,
            trafficDensity: 1.5,
            skyColor: 0x331a2e,
            groundColor: 0x2a1a1a,
            roadColor: 0x2a2a2a,
            fogColor: 0x1a0e1e,
            fogNear: 60,
            fogFar: 300,
            ambientLight: 0.4,
        }
    },

    // ── Scoring ──
    SCORING: {
        FIRST_PLACE: 100,
        SECOND_PLACE: 70,
        THIRD_PLACE: 50,
        FOURTH_PLACE: 20,
        OVERTAKE: 5,
        CLEAN_RIDE_THRESHOLD: 5,  // seconds without crash
        CLEAN_RIDE_BONUS: 20,
        SUCCESSFUL_HIT: 10,
        KNOCKDOWN: 25,
        CRASH_PENALTY: -15,
        HIT_BY_BOT_PENALTY: -5,
        MAX_COMBO_MULTIPLIER: 3,
    },

    // ── Combat ──
    COMBAT: {
        ATTACK_RANGE: 2.5,
        ATTACK_COOLDOWN: 1.5,     // seconds
        STUN_DURATION: 1.2,       // seconds
        KNOCKBACK_FORCE: 0.8,
    },

    // ── Collision ──
    COLLISION: {
        OBSTACLE_SPEED_RESET: 0.3,   // multiply speed by this on obstacle hit
        VEHICLE_STUN_TIME: 1.5,
        SIDE_COLLISION_SHAKE: 0.4,
    },

    // ── Physics ──
    PHYSICS: {
        GRAVITY: -9.8,
        GROUND_FRICTION: 0.98,
        AIR_FRICTION: 0.995,
        LATERAL_FRICTION: 0.92,
        MAX_LATERAL_SPEED: 8,
    },

    // ── Bots ──
    BOTS: {
        COUNT: 3,
        TYPES: ['aggressive', 'defensive', 'balanced'],
        SPAWN_OFFSET: 5,  // distance behind/ahead of player at start
    },

    // ── Achievements ──
    ACHIEVEMENTS: {
        COW_DODGER: { id: 'cow_dodger', name: '🐄 Cow Dodger', desc: 'Avoid 5 cows in one race', threshold: 5 },
        STREET_FIGHTER: { id: 'street_fighter', name: '💥 Street Fighter', desc: '10 hits in one race', threshold: 10 },
        SPEED_DEMON: { id: 'speed_demon', name: '🏁 Speed Demon', desc: 'Finish without any crash', threshold: 0 },
        FIRST_BLOOD: { id: 'first_blood', name: '🥊 First Blood', desc: 'Land your first hit', threshold: 1 },
        WINNER: { id: 'winner', name: '🏆 Winner', desc: 'Win 1st place', threshold: 1 },
    },
};
