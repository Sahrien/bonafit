import { Component } from '@angular/core';
import { TextFieldComponent } from "../../components/text-field/text-field.component";
import { ButtonComponent } from "../../components/button/button.component";

@Component({
  selector: 'app-contact',
  imports: [TextFieldComponent, ButtonComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent {
  name = '';
  email = '';
  message = '';

  sendMessage() {
    console.log({
      name: this.name,
      email: this.email,
      message: this.message,
    });
  }
}
