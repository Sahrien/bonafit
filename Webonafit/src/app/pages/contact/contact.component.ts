import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ButtonComponent } from '../../components/button/button.component';
import { ModalComponent } from '../../components/modal/modal.component';
import { TextFieldComponent } from '../../components/text-field/text-field.component';

@Component({
  selector: 'app-contact',
  imports: [TextFieldComponent, ButtonComponent, ModalComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactComponent {
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly message = signal('');
  protected readonly error = signal('');
  protected readonly showModal = signal(false);

  sendMessage() {
    if (!this.name().trim() || !this.email().trim() || !this.message().trim()) {
      this.error.set('Por favor, completa nombre, email y mensaje.');
      return;
    }

    this.error.set('');
    this.showModal.set(true);
    this.name.set('');
    this.email.set('');
    this.phone.set('');
    this.message.set('');
  }
}
