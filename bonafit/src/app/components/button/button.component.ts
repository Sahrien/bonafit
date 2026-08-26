import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  text = input<string>('');
  clicked = output<void>();

  onClick() {
    this.clicked.emit();
  }
}
