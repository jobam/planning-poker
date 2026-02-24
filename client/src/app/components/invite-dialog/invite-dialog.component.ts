import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-invite-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invite-dialog.component.html',
  styleUrl: './invite-dialog.component.css',
})
export class InviteDialogComponent {
  gameId = input.required<string>();
  isOpen = input(false);
  closed = output<void>();
  copied = signal(false);

  gameUrl = computed(() => `${window.location.origin}/game/${this.gameId()}`);

  copyToClipboard(): void {
    navigator.clipboard.writeText(this.gameUrl()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}
