import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { BehaviorSubject, Observable } from 'rxjs';

interface GameState {
  isGameOver: boolean;
  isGameActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  // Three.js properties
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  
  // Game objects
  private player!: THREE.Group;
  private track!: THREE.Mesh;
  private obstacles: THREE.Object3D[] = [];
  private coins: THREE.Object3D[] = [];
  
  // Game state
  private _score = new BehaviorSubject<number>(0);
  private _gameState = new BehaviorSubject<GameState>({
    isGameOver: false,
    isGameActive: false
  });
  
  // Game settings
  private playerLane: number = 1; // 0: left, 1: center, 2: right
  private lanes: number[] = [-2, 0, 2]; // x-positions of lanes
  private isJumping: boolean = false;
  private speed: number = 0.2;
  private trackLength: number = 500;
  private trackPosition: number = 0;
  
  // Renderer
  private renderer!: THREE.WebGLRenderer;
  
  // Public observables
  public scoreObservable: Observable<number> = this._score.asObservable();
  public gameStateObservable: Observable<GameState> = this._gameState.asObservable();
  
  constructor() {}
  
  initGame(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, -10);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    
    // Add directional light (sunlight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 10, 10);
    this.scene.add(directionalLight);
    
    // Create track
    this.createTrack();
    
    // Create player
    this.createPlayer();
  }
  
  createTrack(): void {
    // Create the base track
    const trackGeometry = new THREE.BoxGeometry(6, 0.5, this.trackLength);
    const trackMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      roughness: 0.8
    });
    this.track = new THREE.Mesh(trackGeometry, trackMaterial);
    this.track.position.set(0, -0.25, -this.trackLength / 2);
    this.scene.add(this.track);
    
    // Add temple walls
    const wallHeight = 5;
    const wallMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xCDAA7D,
      roughness: 0.7
    });
    
    // Left wall
    const leftWallGeometry = new THREE.BoxGeometry(1, wallHeight, this.trackLength);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-3.5, wallHeight / 2 - 0.25, -this.trackLength / 2);
    this.scene.add(leftWall);
    
    // Right wall
    const rightWallGeometry = new THREE.BoxGeometry(1, wallHeight, this.trackLength);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(3.5, wallHeight / 2 - 0.25, -this.trackLength / 2);
    this.scene.add(rightWall);
    
    // Add decorative elements to walls
    this.addWallDecorations(leftWall.position.x, rightWall.position.x);
    
    // Place obstacles and coins
    this.generateObstaclesAndCoins();
  }
  
  addWallDecorations(leftX: number, rightX: number): void {
    // Add torches and carvings to the walls
    const torchGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
    const torchMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const flameMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFF4500, 
      emissive: 0xFF4500, 
      emissiveIntensity: 0.5 
    });
    
    for (let z = -10; z > -this.trackLength; z -= 20) {
      // Left torch
      const leftTorch = new THREE.Mesh(torchGeometry, torchMaterial);
      leftTorch.position.set(leftX + 0.5, 2, z);
      leftTorch.rotation.x = Math.PI / 2;
      this.scene.add(leftTorch);
      
      const leftFlame = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, 0.4, 8),
        flameMaterial
      );
      leftFlame.position.set(leftX + 0.5, 2, z - 0.5);
      this.scene.add(leftFlame);
      
      // Right torch
      const rightTorch = new THREE.Mesh(torchGeometry, torchMaterial);
      rightTorch.position.set(rightX - 0.5, 2, z);
      rightTorch.rotation.x = Math.PI / 2;
      this.scene.add(rightTorch);
      
      const rightFlame = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, 0.4, 8),
        flameMaterial
      );
      rightFlame.position.set(rightX - 0.5, 2, z - 0.5);
      this.scene.add(rightFlame);
    }
  }
  
  createPlayer(): void {
    // Player group to hold all player parts
    this.player = new THREE.Group();
    
    // Player body
    const bodyGeometry = new THREE.BoxGeometry(0.7, 1.2, 0.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x1E90FF });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    this.player.add(body);
    
    // Player head
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.4;
    this.player.add(head);
    
    // Player legs
    const legGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x000080 });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.2, 0, 0);
    this.player.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.2, 0, 0);
    this.player.add(rightLeg);
    
    // Initial position
    this.player.position.set(this.lanes[this.playerLane], 0, 0);
    this.scene.add(this.player);
  }
  
  generateObstaclesAndCoins(): void {
    // Clear existing obstacles and coins
    this.obstacles.forEach(obstacle => this.scene.remove(obstacle));
    this.coins.forEach(coin => this.scene.remove(coin));
    this.obstacles = [];
    this.coins = [];
    
    // Generate obstacles
    for (let z = -15; z > -this.trackLength + 15; z -= Math.random() * 10 + 5) {
      // Determine which lanes will have obstacles
      const obstacleLane = Math.floor(Math.random() * 3);
      this.createObstacle(this.lanes[obstacleLane], z);
      
      // Add coins in lanes without obstacles, with some randomness
      for (let lane = 0; lane < 3; lane++) {
        if (lane !== obstacleLane && Math.random() > 0.3) {
          this.createCoin(this.lanes[lane], z - Math.random() * 3);
        }
      }
    }
  }
  
  createObstacle(x: number, z: number): void {
    // Randomly choose obstacle type
    const obstacleType = Math.floor(Math.random() * 3);
    let obstacle: THREE.Object3D;
    
    if (obstacleType === 0) {
      // Rock
      const rockGeometry = new THREE.SphereGeometry(0.6, 8, 6);
      const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 1 });
      obstacle = new THREE.Mesh(rockGeometry, rockMaterial);
      obstacle.position.y = 0.4;
      (obstacle as THREE.Mesh).scale.y = 0.7;
    } else if (obstacleType === 1) {
      // Log
      const logGeometry = new THREE.CylinderGeometry(0.4, 0.4, 2, 8);
      const logMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
      obstacle = new THREE.Mesh(logGeometry, logMaterial);
      obstacle.position.y = 0.4;
      obstacle.rotation.x = Math.PI / 2;
      obstacle.rotation.z = Math.PI / 2;
    } else {
      // Statue
      const baseGeometry = new THREE.BoxGeometry(0.8, 0.4, 0.8);
      const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xA9A9A9 });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      
      const statueGeometry = new THREE.ConeGeometry(0.4, 1.2, 4);
      const statueMaterial = new THREE.MeshStandardMaterial({ color: 0xDAA520 });
      const statue = new THREE.Mesh(statueGeometry, statueMaterial);
      statue.position.y = 0.8;
      
      obstacle = new THREE.Group();
      obstacle.add(base);
      obstacle.add(statue);
      obstacle.position.y = 0.2;
    }
    
    obstacle.position.set(x, obstacle.position.y, z);
    this.scene.add(obstacle);
    this.obstacles.push(obstacle);
  }
  
  createCoin(x: number, z: number): void {
    const coinGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16);
    const coinMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFD700,
      metalness: 0.8,
      roughness: 0.3,
      emissive: 0xFFD700,
      emissiveIntensity: 0.2
    });
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);
    coin.rotation.x = Math.PI / 2;
    coin.position.set(x, 0.8, z);
    this.scene.add(coin);
    this.coins.push(coin);
  }
  
  handleKeyDown(event: KeyboardEvent): void {
    const gameState = this._gameState.value;
    if (!gameState.isGameActive || gameState.isGameOver) return;
    
    switch (event.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.moveLanes(-1);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.moveLanes(1);
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
      case ' ':
        this.jump();
        break;
    }
  }
  
  moveLanes(direction: number): void {
    const newLane = Math.max(0, Math.min(2, this.playerLane + direction));
    if (newLane !== this.playerLane) {
      this.playerLane = newLane;
      // Animate the lane change
      const targetX = this.lanes[this.playerLane];
      const startX = this.player.position.x;
      let progress = 0;
      
      const animateLaneChange = () => {
        progress += 0.1;
        if (progress < 1) {
          this.player.position.x = startX + (targetX - startX) * progress;
          requestAnimationFrame(animateLaneChange);
        } else {
          this.player.position.x = targetX;
        }
      };
      
      animateLaneChange();
    }
  }
  
  jump(): void {
    if (this.isJumping) return;
    
    this.isJumping = true;
    const initialY = this.player.position.y;
    const jumpHeight = 2;
    let jumpProgress = 0;
    
    const animateJump = () => {
      jumpProgress += 0.05;
      
      // Parabolic jump
      const height = jumpHeight * Math.sin(jumpProgress * Math.PI);
      this.player.position.y = initialY + height;
      
      if (jumpProgress < 1) {
        requestAnimationFrame(animateJump);
      } else {
        this.player.position.y = initialY;
        this.isJumping = false;
      }
    };
    
    animateJump();
  }
  
  updateGame(): void {
    const gameState = this._gameState.value;
    if (!gameState.isGameActive || gameState.isGameOver) return;
    
    // Increase speed gradually to make game harder
    this.speed += 0.00005;
    
    // Update track position (giving the illusion of movement)
    this.trackPosition += this.speed;
    
    // Check if we need to restart the track
    if (this.trackPosition >= this.trackLength - 20) {
      this.trackPosition = 0;
      // Regenerate obstacles and coins
      this.generateObstaclesAndCoins();
    }
    
    // Move obstacles and check collisions
    this.obstacles.forEach(obstacle => {
      obstacle.position.z += this.speed;
      
      // Check for collision with player
      if (this.isPlayerColliding(obstacle)) {
        this.gameOver();
      }
    });
    
    // Move coins and check collisions
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.position.z += this.speed;
      coin.rotation.z += 0.05; // Spin coin
      
      // Check if player collected coin
      if (this.isPlayerColliding(coin)) {
        this.scene.remove(coin);
        this.coins.splice(i, 1);
        this.increaseScore(10);
      }
    }
    
    // Increase score based on distance
    this.increaseScore(0.1);
  }
  
  isPlayerColliding(object: THREE.Object3D): boolean {
    // Simple collision detection based on proximity
    const playerBounds = {
      x: this.player.position.x,
      z: this.player.position.z,
      width: 0.7,
      depth: 0.5,
      y: this.player.position.y,
      height: this.isJumping ? 0 : 1.5 // Gives player a pass when jumping
    };
    
    const objectBounds = {
      x: object.position.x,
      z: object.position.z,
      width: 0.8,
      depth: 0.8,
      y: object.position.y,
      height: 1
    };
    
    // Check X axis (lane) collision
    const xCollision = Math.abs(playerBounds.x - objectBounds.x) < (playerBounds.width + objectBounds.width) / 2;
    
    // Check Z axis (forward) collision
    const zCollision = Math.abs(playerBounds.z - objectBounds.z) < (playerBounds.depth + objectBounds.depth) / 2;
    
    // Check Y axis (jumping) collision
    const yCollision = Math.abs(playerBounds.y - objectBounds.y) < (playerBounds.height + objectBounds.height) / 2;
    
    return xCollision && zCollision && yCollision;
  }
  
  increaseScore(amount: number): void {
    const currentScore = this._score.value;
    this._score.next(currentScore + amount);
  }
  
  gameOver(): void {
    this._gameState.next({
      isGameOver: true,
      isGameActive: false
    });
  }
  
  startGame(): void {
    this._score.next(0);
    this._gameState.next({
      isGameOver: false,
      isGameActive: true
    });
  }
  
  restartGame(): void {
    // Reset game state
    this._score.next(0);
    this.speed = 0.2;
    this.trackPosition = 0;
    this.playerLane = 1;
    this.isJumping = false;
    
    // Reset player position
    this.player.position.set(this.lanes[this.playerLane], 0, 0);
    
    // Regenerate obstacles and coins
    this.generateObstaclesAndCoins();
    
    // Update game state
    this._gameState.next({
      isGameOver: false,
      isGameActive: true
    });
  }
  
  onWindowResize(): void {
    if (this.camera) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }
  }
  
  dispose(): void {
    // Remove all objects from scene to free memory
    while(this.scene.children.length > 0) { 
      const object = this.scene.children[0];
      this.scene.remove(object);
    }
  }
}
