import { Component, input, computed } from '@angular/core';
import { Player } from '../../models/game.models';

@Component({
  selector: 'app-player-card',
  standalone: true,
  templateUrl: './player-card.component.html',
  styleUrl: './player-card.component.css',
})
export class PlayerCardComponent {
  player = input.required<Player>();
  revealed = input(false);

  initials = computed(() => this.player().name.charAt(0).toUpperCase());
}
