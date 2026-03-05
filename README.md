# OlelaFinder

A powerful Minecraft World Generation API service that provides real-time biome and structure location queries. Built with TypeScript and powered by the [deepslate](https://github.com/misode/deepslate) library, with flexible support for custom datapacks including Tectonic and Dungeons & Taverns.

---

## Features

- **Biome Detection** - Query biomes at any coordinate with climate parameters
- **Structure Location** - Find 121+ structures including vanilla and modded content
- **Area Scanning** - Scan large regions for biomes and structures
- **Nearest Search** - Locate the closest biome or structure from any point
- **Datapack Support** - Flexible loading of any custom datapacks (Tectonic, Dungeons & Taverns, etc.)
- **Fast & Efficient** - Optimized world generation calculations
- **RESTful API** - Easy-to-use HTTP endpoints

---

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/kelemiao/OlelaFinder.git
cd OlelaFinder

# Navigate to API directory
cd src-api

# Install dependencies
npm install
```

### Running the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000` by default.

---

## Configuration

> **IMPORTANT: All world and datapack configurations are in `src-api/src/config.ts`**

### Quick Start Configuration

A configuration example file is provided at `src-api/config.example.ts`. You can use it as a reference for your own configuration.

### How to Modify Configuration

Open `src-api/src/config.ts` and edit the following settings:

```typescript
export const CONFIG = {
  // World seed - Change this to use a different world
  seed: "877470420230587172",

  // Minecraft version
  mcVersion: "1_21_7",

  // Dimension (overworld, nether, end)
  dimension: "minecraft:overworld",

  // World preset
  worldPreset: "minecraft:normal",

  // Vanilla datapack filename (in public/vanilla_datapacks/)
  vanillaDatapackFile: "vanilla_1_21_7.zip",

  // Custom datapacks to load (optional)
  // Add any datapack ZIP files you want to load here
  // Place your datapack files in the project root directory
  customDatapacks: [
    // Example: Uncomment to enable
    // "main_tectonic-datapack-3.0.13 (1).zip",
    // "Dungeons and Taverns v4.7.3.zip",
    // "your_custom_pack.zip",
  ],

  // Server port
  port: process.env.PORT || 3000,
};
```

### Configuration Options Explained

| Setting | Description | Example |
|---------|-------------|---------|
| `seed` | World seed for generation | `"877470420230587172"` |
| `mcVersion` | Minecraft version (use underscores) | `"1_21_7"` |
| `dimension` | World dimension | `"minecraft:overworld"` |
| `worldPreset` | World generation preset | `"minecraft:normal"` |
| `vanillaDatapackFile` | Vanilla datapack ZIP file (required) | `"vanilla_1_21_7.zip"` |
| `customDatapacks` | Array of custom datapack filenames (optional) | `["Tectonic-3.0.13.zip"]` |
| `port` | Server port | `3000` |

### Adding Custom Datapacks

1. Place your datapack ZIP file in the project root directory
2. Edit `src-api/src/config.ts` and add the filename to `customDatapacks` array:
   ```typescript
   customDatapacks: [
     "Tectonic-3.0.13.zip",
     "Dungeons and Taverns v4.7.3.zip",
     "your_custom_pack.zip",
   ]
   ```
3. Restart the server

### Current Configuration

- **Seed**: `877470420230587172`
- **Version**: Minecraft 1.21.7
- **Datapacks**: Vanilla only (no custom datapacks by default)
- **Supported Biomes**: 62 (vanilla)
- **Supported Structures**: 23+ (vanilla, more with custom datapacks)

---

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Biome Endpoints

#### Get Biome at Coordinates
```http
GET /api/biome?x=0&z=0&y=64
```

**Response:**
```json
{
  "x": 0,
  "z": 0,
  "y": 64,
  "biome": "minecraft:deep_ocean",
  "surface": 71.69
}
```

#### Get Biomes in Area
```http
GET /api/biomes/area?minX=-100&minZ=-100&maxX=100&maxZ=100&y=64&step=16
```

**Parameters:**
- `minX`, `minZ` - Area minimum coordinates
- `maxX`, `maxZ` - Area maximum coordinates
- `y` - Y coordinate (height)
- `step` - Sampling interval (default: 16)

#### Get Climate Parameters
```http
GET /api/climate?x=0&z=0&y=64
```

**Response:**
```json
{
  "x": 0,
  "z": 0,
  "y": 64,
  "temperature": 0.5,
  "humidity": 0.3,
  "continentalness": -0.8,
  "erosion": 0.1,
  "depth": 0,
  "weirdness": 0.4
}
```

#### Locate Nearest Biome
```http
GET /api/locate?biome=minecraft:plains&x=0&z=0&y=64&maxRadius=6400&step=32
```

**Parameters:**
- `biome` - Biome ID (e.g., `minecraft:plains`)
- `x`, `z` - Starting coordinates
- `y` - Y coordinate
- `maxRadius` - Maximum search radius (default: 6400)
- `step` - Search step size (default: 32)

**Response:**
```json
{
  "found": true,
  "biome": "minecraft:plains",
  "x": 1214,
  "z": 54,
  "y": 64,
  "distance": 1215,
  "surface": 72.5
}
```

### Structure Endpoints

#### List All Structures
```http
GET /api/structures
```

Returns all available structures with support status.

#### Find Structure at Coordinates
```http
GET /api/structure?x=0&z=0
```

#### Find Structures in Area
```http
GET /api/structures/area?x=0&z=0&radius=1000
```

#### Locate Nearest Structure
```http
GET /api/locate/structure?structure=minecraft:village_plains&x=0&z=0&maxRadius=6400
```

**Parameters:**
- `structure` - Structure ID (e.g., `minecraft:village_plains`, `nova_structures:tavern_oak`)
- `x`, `z` - Starting coordinates
- `maxRadius` - Maximum search radius (default: 6400)

### System Endpoints

#### Get Server Status
```http
GET /api/status
```

**Response:**
```json
{
  "status": "ok",
  "seed": "877470420230587172",
  "version": "1.21.7",
  "datapacks": ["Tectonic 3.0.13", "DNT v4.7.3"],
  "supportedBiomes": 62,
  "supportedStructures": 121
}
```

---

## Supported Features

### Biomes

The API supports all vanilla Minecraft 1.21.7 biomes by default. When you add custom datapacks like Tectonic, additional biomes become available.

Vanilla biomes include:
- Plains, Forests, Deserts, Jungles, Taigas
- Ocean variants (Warm, Cold, Frozen, Deep)
- Mountain biomes (Peaks, Slopes, Meadows)
- Cave biomes (Lush Caves, Dripstone Caves, Deep Dark)
- Nether biomes (5 types)
- And more...

See [SUPPORTED_FEATURES.md](src-api/SUPPORTED_FEATURES.md) for the complete list.

### Structures

#### Vanilla Structures (23+)
- Villages (5 variants)
- Temples (Desert, Jungle, Swamp Hut)
- Monuments (Ocean Monument, Ancient City, Trial Chambers)
- Strongholds, End Cities, Woodland Mansions
- Nether Fortresses, Bastion Remnants
- And more...

#### Custom Datapack Structures
When you add custom datapacks like Dungeons & Taverns, additional structures become available:
- Taverns, Firewatch Towers, Custom Villages
- Dungeons, Crypts, Shrines
- Illager structures, Nether structures, End structures
- And many more...

See [SUPPORTED_FEATURES.md](src-api/SUPPORTED_FEATURES.md) for the complete structure list with IDs.

---

## Development

### Project Structure

```
OlelaFinder/
├── src-api/                    # API source code
│   ├── src/
│   │   ├── config.ts          # CONFIGURATION FILE (EDIT THIS!)
│   │   ├── server.ts          # Express server
│   │   ├── api/
│   │   │   └── routes.ts      # API routes
│   │   └── core/
│   │       ├── BiomeCalculator.ts
│   │       └── StructureFinder.ts
│   ├── package.json
│   └── SUPPORTED_FEATURES.md  # Feature documentation
├── public/
│   └── vanilla_datapacks/     # Vanilla datapack storage
├── main_tectonic-datapack-3.0.13 (1).zip
├── Dungeons and Taverns v4.7.3.zip
└── README.md
```

### Adding Custom Datapacks

1. Place your datapack ZIP file in the project root directory
2. Edit `src-api/src/config.ts`:
   ```typescript
   customDatapacks: ["your_custom_pack.zip"]
   ```
3. Restart the server

### Building for Production

```bash
npm run build
npm start
```

---

## Examples

### Find the nearest village from spawn
```bash
curl "http://localhost:3000/api/locate/structure?structure=minecraft:village_plains&x=0&z=0"
```

### Get biome at coordinates
```bash
curl "http://localhost:3000/api/biome?x=1000&z=2000&y=64"
```

### Find all structures within 2000 blocks
```bash
curl "http://localhost:3000/api/structures/area?x=0&z=0&radius=2000"
```

### Locate nearest custom structure (requires custom datapack)
```bash
# Example with Dungeons & Taverns datapack loaded
curl "http://localhost:3000/api/locate/structure?structure=nova_structures:tavern_oak&x=0&z=0"
```

---

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

---

## License

This project is for educational and research purposes.

---

## Author

**kelemiao**
- GitHub: [@kelemiao](https://github.com/kelemiao)

---

## Related Projects

- [deepslate](https://github.com/misode/deepslate) - Minecraft world generation library
- [Tectonic](https://modrinth.com/datapack/tectonic) - Overhauled world generation datapack
- [Dungeons and Taverns](https://modrinth.com/datapack/dungeons-and-taverns) - Structure datapack

---

## Acknowledgments

- Thanks to [Misode](https://github.com/misode) for the amazing deepslate library
- Tectonic datapack by Apollo
- Dungeons and Taverns datapack by Noaaan

---

**If you find this project useful, please consider giving it a star!**