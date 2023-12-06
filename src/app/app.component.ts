import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import * as formJson from '../assets/forms.json';
import { FormControl, FormGroup, Validators } from '@angular/forms';

enum Operator {
  GREATER = 'greater',
  SMALLER = 'smaller',
  EQUAL = 'equal',
}

enum Entity {
  PAGE = 'page',
  FORM_GROUP = 'form_group',
  FORM_FIELD = 'form_field',
}

enum Direction {
  NEXT = 'next',
  PREVIOUS = 'previous',
}

enum ValidationType {
  DISPLAY = 'display',
  REQUIRED = 'requried',
  // ... other validation types
}

interface ConditionalRules {
  sequence: number[];
  rule: Operator;
  value: any;
}

interface ConditionalValidation {
  validation: ValidationType;
  sequence: number;
  rules: ConditionalRules[];
  value?: any;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title: string = '';
  tgSequence = [0, 1, 2, 3];
  currentSequence = this.tgSequence[0];

  jsonData: any = formJson;

  pages: any[] = [];
  fg1FormFields: [] = [];

  inputForms = new FormGroup({});

  sequenceMatcher = new Map();

  // ---------------------------------
  // Page 1 (basic Details) -- show on all TGs

  // FG1 -- show on all TGs
  // Input A
  // default required false
  // on TG3 & TG4 required true

  // Input B
  // default required true
  // on TG4 required

  // Input C
  // default hide, required true
  // show on all TGs if
  // A is greater than 3
  // B is equal to 9

  // FG2 -- add in TG2 onwards
  // FG3 -- show on all TGs
  // ---------------------------------

  // ---------------------------------
  // Page 2 (Only on TG2) -- show on TG2 only
  // ----------------------------------

  // ---------------------------------
  // Page 3 (Responsible Auths) -- except TG1 show on all
  // FG1 -- show by default
  // FG2 -- show by default
  // ----------------------------------

  entityTypes = Entity;

  constructor(private cdr: ChangeDetectorRef) {}

  // Method to trigger reevaluation of canDisplay
  private _triggerCanDisplayReevaluation() {
    // Mark for check to trigger change detection
    this.cdr.detectChanges();
  }

  ngOnInit(): void {
    this.title = this.jsonData.form.name;
    this.pages = this.jsonData.form.pages;
    // for this POC, keeping it simple
    // taking only 1 Form group for demo
    this.fg1FormFields = this.pages[0].gs[0].formFields;

    const formControls = this.fg1FormFields.reduce(
      (controls: any, field: any) => {
        // Use a Map to store sequences and field names
        this.sequenceMatcher.set(field.sequence, field.name);

        // Define validators based on the field configuration
        const fieldValidators = [];
        if (field.configurations.validations.required) {
          fieldValidators.push(Validators.required);
        }

        controls[field.name] = new FormControl('', fieldValidators);
        return controls;
      },
      {}
    );

    this.inputForms = new FormGroup(formControls);
  }

  inputChange() {
    this._triggerCanDisplayReevaluation();
  }

  getControlErrors(controlName: string) {
    const control = this.inputForms.get(controlName) as FormControl;
    return control ? control.errors : null;
  }

  next() {
    this._changeSequence(Direction.NEXT);
  }

  previous() {
    this._changeSequence(Direction.PREVIOUS);
  }

  private _changeSequence(direction: Direction) {
    let index = this.tgSequence.indexOf(this.currentSequence);
    const sequenceLength = this.tgSequence.length;

    if (direction === Direction.NEXT) {
      index += 1;
      if (index < sequenceLength) {
        this.currentSequence = this.tgSequence[index];
      }
    } else if (direction === Direction.PREVIOUS) {
      index -= 1;
      if (index >= 0) {
        this.currentSequence = this.tgSequence[index];
      }
    }
  }

  private _checkCondition(
    op: string,
    dpValue: number,
    formValue: number
  ): boolean {
    switch (op) {
      case Operator.SMALLER:
        return dpValue > formValue;
      case Operator.GREATER:
        return dpValue < formValue;
      case Operator.EQUAL:
        return dpValue === formValue;
      default:
        return false;
    }
  }

  canDisplay(
    entity: Entity,
    conditions: ConditionalValidation[] | undefined
  ): boolean {
    if (!conditions) return false;

    // By default, show the entity
    if (!conditions.length) return true;

    if (entity === Entity.PAGE || entity === Entity.FORM_GROUP) {
      return this._checkDisplayForPageOrFormGroup(conditions);
    } else if (entity === Entity.FORM_FIELD) {
      return this._checkDisplayForFormField(conditions);
    }

    return false;
  }

  private _checkDisplayForPageOrFormGroup(
    conditions: ConditionalValidation[]
  ): boolean {
    // For PAGE or FORM_GROUP, check for sequence
    return conditions.some((val) => this.currentSequence === val.sequence);
  }

  private _checkDisplayForFormField(
    conditions: ConditionalValidation[]
  ): boolean {
    // For FORM_FIELD, check for DISPLAY validation and rule conditions
    return conditions.every((val) => {
      if (
        val.validation === ValidationType.DISPLAY &&
        (this.currentSequence === val.sequence || val.sequence === undefined)
      ) {
        if (!val.rules.length) return true;
        return val.rules.every((rule) => this._checkFormFieldRule(rule));
      }
      // by default show the entity
      return true;
    });
  }

  private _checkFormFieldRule(rule: ConditionalRules): boolean {
    const formFields = rule.sequence.map((seq) =>
      this.inputForms.get(this.sequenceMatcher.get(seq))
    );
    if (formFields.length) {
      return formFields.every((ff) =>
        this._checkCondition(rule.rule, rule.value, ff?.value)
      );
    }
    return false;
  }
}
