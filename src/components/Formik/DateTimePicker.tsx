import React from "react";
import {FieldProps} from "formik";
import ReactDatetime, {DatetimepickerProps} from "react-datetime";
import {FloatingLabel, FormControl} from "react-bootstrap";


interface IFormikDateTimePickerProps extends FieldProps {
    pickerProps: DatetimepickerProps;
    placeholder?: string;
}

const FormikDateTimePicker = (props: IFormikDateTimePickerProps) => {
    const {field, form, pickerProps, ...rest} = props;
    const isInvalid = form.touched[field.name] && Boolean(form.errors[field.name]);
    const isValid = form.touched[field.name] && !Boolean(form.errors[field.name]);

    return (
        <ReactDatetime
            {...pickerProps}
            renderInput={(inputProps) => (
                <FloatingLabel label={rest.placeholder}>
                    <FormControl
                        {...inputProps}
                        {...rest}
                        value={field.value}
                        name={field.name}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        isInvalid={isInvalid}
                        isValid={isValid}
                    />

                    {isInvalid && (
                        <FormControl.Feedback tooltip={true} type={'invalid'}>
                            {form.errors[field.name]}
                        </FormControl.Feedback>
                    )}
                </FloatingLabel>
            )}
            initialValue={new Date(field.value)}
            initialViewDate={field.value}
            onChange={(selected) => {
                const date = typeof selected === 'string'
                    ? selected
                    : selected.toDate().toDateString()
                form.setFieldValue(field.name, date);
            }}
        />
    );
}

export default FormikDateTimePicker;
