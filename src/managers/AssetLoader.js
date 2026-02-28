/* ═══════════════════════════════════════════════════
   AssetLoader — Handles external 3D models and textures
   ═══════════════════════════════════════════════════ */

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AssetLoader {
    constructor() {
        this.models = {};
        this.gltfLoader = new GLTFLoader();
    }

    async loadAll(onProgress) {
        // Define the assets to load
        const assets = [
            { id: 'tree_elm', url: '/assets/models/tree_elm.glb' },
            { id: 'cow', url: '/assets/models/cow.glb' }
        ];

        let loadedCount = 0;
        const total = assets.length;

        const promises = assets.map(asset => {
            return new Promise((resolve) => {
                this.gltfLoader.load(
                    asset.url,
                    (gltf) => {
                        const object = gltf.scene;

                        // Pre-process the model (e.g., enable shadows)
                        object.traverse((child) => {
                            if (child.isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                            }
                        });

                        this.models[asset.id] = object;

                        loadedCount++;
                        if (onProgress) {
                            onProgress(loadedCount / total);
                        }
                        resolve();
                    },
                    undefined, // xhr progress
                    (error) => {
                        console.error(`Failed to load model ${asset.url}:`, error);
                        // Resolve anyway to not break the game, we'll use fallback models
                        loadedCount++;
                        if (onProgress) onProgress(loadedCount / total);
                        resolve();
                    }
                );
            });
        });

        await Promise.all(promises);
    }

    getModel(id) {
        if (this.models[id]) {
            // Return a deep clone so we can have multiple instances
            return this.models[id].clone();
        }
        return null;
    }
}
