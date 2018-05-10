import { Directive, ElementRef, Input, OnDestroy, OnInit, Optional, TemplateRef, ViewContainerRef } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import { NrfModelSetterService } from './model-setter.service';
import { takeWhile } from 'rxjs/operators';
import { NrfNestedFormService } from '../form/nested-form.service';

export class NrfNestedControlContext {
  $implicit: FormControl;

  constructor(
    public formControl: FormControl,
    public formGroup: FormGroup,
    public nrfNestedControl: NrfNestedControlDirective,
  ) {
    this.$implicit = formControl;
  }

}

/**
 * This directive control nested inputs and sets values on the Original Model set at {@link NrfFormDirective#nrfEntity}
 *
 * #### Given an nrfEntity on the controller:
 * ```typescript
 * this.userModel = {
 *    firstName: 'John',
 *    address: {
 *        street: 'Carnaby Street'
 *    }
 * };
 * ```
 *
 * #### Use it on the form
 * ```html
 * <form [nrfEntity]="userModel">
 *   <div class="form-group">
 *      <label for="name">Name:</label>
 *
 *      <div *nrfNestedControl="'userModel.firstName'; let control=formControl">
 *        <input [formControl]="control" />
 *      </div>
 *   </div>
 * </form>
 * ```
 */
@Directive({
  selector: '[nrfNestedControl]',
  exportAs: 'nrfNestedControl',
})
export class NrfNestedControlDirective implements OnInit, OnDestroy {

  /**
   * The dot notation full name of the nrfEntity
   */
    // tslint:disable-next-line:no-input-rename
  @Input('nrfNestedControl') nrfModelName: string;


  private isRegisteredToFormControl = false;
  private isDestroyed = false;

  parentFormGroup: FormGroup;
  formControl: FormControl;
  modelPath: string;
  inputEl: HTMLInputElement;


  constructor(
    private modelSetter: NrfModelSetterService,
    @Optional() private readonly nestedFormService: NrfNestedFormService,
    private templateRef: TemplateRef<any>,
    private viewContainerRef: ViewContainerRef,
    { nativeElement }: ElementRef,
  ) {
    this.inputEl = nativeElement;
  }


  /**
   * Register this input component to its parent form [FormGroup]{@link https://angular.io/api/forms/FormGroup}
   *
   * And starts to emit the input's value when it changes.
   */
  ngOnInit() {
    this.modelPath = this.getModelPathWithoutFirstPart();
    this.registerToFormGroup();
    this.subscribeToValueChanges();
    this.showViewContent();
  }


  ngOnDestroy() {
    this.isDestroyed = true;

    if (this.parentFormGroup) {
      this.parentFormGroup.removeControl(this.nrfModelName);
    }
  }


  private showViewContent() {
    const context = new NrfNestedControlContext(
      this.formControl,
      this.parentFormGroup,
      this,
    );

    this.viewContainerRef.createEmbeddedView(this.templateRef, context);
  }


  /**
   * Register this input to its parent [FormGroup]{@link https://angular.io/api/forms/FormGroup}
   * to enable validations and data manipulation
   */
  private registerToFormGroup() {
    if (this.isRegisteredToFormControl) {
      return;
    }

    const formGroup = this.getFormGroup();
    const formControl = this.getFormControl(formGroup);

    this.formControl = formControl;
    this.inputEl.value = formControl.value || '';

    if (formGroup) {
      this.isRegisteredToFormControl = true;
      this.parentFormGroup = formGroup;
      formGroup.addControl(this.nrfModelName, formControl);
    }
  }


  /**
   * Verify if this input is inside a [NrfFormDirective]{@link NrfFormDirective}
   * and return its [FormGroup]{@link https://angular.io/api/forms/FormGroup}
   *
   * Otherwise a new empty [FormGroup]{@link https://angular.io/api/forms/FormGroup}
   */
  private getFormGroup() {
    if (this.nestedFormService) {
      return this.nestedFormService.formGroup;
    }

    return new FormGroup({});
  }


  /**
   * Verify if the [FormGroup]{@link https://angular.io/api/forms/FormGroup} has an control with the current name and return it.
   * Otherwise return a new [FormControl]{@link https://angular.io/api/forms/FormControl}
   */
  protected getFormControl(formGroup: FormGroup): FormControl {
    let formControl = formGroup && <FormControl>formGroup.get(this.nrfModelName);

    if (!formControl) {
      formControl = this.getNewFormControl();
    }

    return formControl;
  }


  /**
   * Instantiate a new [FormControl]{@link https://angular.io/api/forms/FormControl} and return it
   */
  protected getNewFormControl(): FormControl {
    const initialValue = this.getInitialValue();
    return new FormControl(initialValue || null);
  }


  /**
   * Subscribe to [valueChanges]{@link https://angular.io/api/forms/AbstractControl#valueChanges} and update the Entity value
   */
  private subscribeToValueChanges() {
    this.formControl.valueChanges
      .pipe(takeWhile(() => !this.isDestroyed))
      .subscribe(newValue => this.setModelValue(newValue));
  }


  /**
   * Return the dot notation path of the Entity, without the first part,
   * because it is the Entity itself.
   */
  private getModelPathWithoutFirstPart(): string {
    return this.nrfModelName.substr(this.nrfModelName.indexOf('.') + 1);
  }


  /**
   * Get the value from the [nrfEntity]{@link NrfFormDirective#nrfEntity}
   */
  private getInitialValue(): any | null {
    if (this.nestedFormService) {
      return this.modelSetter.getValue(this.modelPath, this.nestedFormService.entity);
    }

    return null;
  }


  /**
   * Set the value to the [formData]{@link NrfFormDirective#formData}
   */
  private setModelValue(newValue: any) {
    if (this.nestedFormService) {
      return this.modelSetter.setValue(this.modelPath, newValue || '', this.nestedFormService.formData);
    }
  }

}