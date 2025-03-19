import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, NgZone, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { GameService } from '../../services/game.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  imports: [CommonModule],
  standalone: true,
})
export class GameComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('rendererContainer') rendererContainer!: ElementRef;

  score: number = 0;
  isGameOver: boolean = false;
  isGameActive: boolean = false;
  showStartScreen: boolean = true;

  private renderer!: THREE.WebGLRenderer;
  private animationId: number = 0;

  constructor(
    private gameService: GameService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.gameService.scoreObservable.subscribe(score => {
      this.score = Math.floor(score);
    });

    this.gameService.gameStateObservable.subscribe(state => {
      this.isGameOver = state.isGameOver;
      this.isGameActive = state.isGameActive;
    });
  }

  ngAfterViewInit(): void {
    // Initialize Three.js renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);

    // Initialize game
    this.gameService.initGame(this.renderer);

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Handle keyboard input
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    
    // Clean up Three.js resources
    this.gameService.dispose();
  }

  startGame(): void {
    this.showStartScreen = false;
    this.gameService.startGame();
    this.ngZone.runOutsideAngular(() => {
      this.animate();
    });
  }

  restartGame(): void {
    this.gameService.restartGame();
    if (!this.animationId) {
      this.ngZone.runOutsideAngular(() => {
        this.animate();
      });
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.gameService.updateGame();
    this.renderer.render(this.gameService.scene, this.gameService.camera);
  }

  private onWindowResize(): void {
    this.gameService.onWindowResize();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    this.gameService.handleKeyDown(event);
  }
}