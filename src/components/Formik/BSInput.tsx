import React from "react";
import {FieldProps, FormikErrors, FormikTouched} from 'formik';
import {FormControl} from "react-bootstrap";


interface IFormikBSInputProps extends FieldProps {
    arrayName?: string;
    arrayIndex?: number;
}

const FormikBSInput = (props: IFormikBSInputProps) => {
    const {field, form, arrayName = '', arrayIndex, ...rest} = props;

    const touched = arrayName && arrayIndex !== undefined
        ? form.touched[arrayName]
            ? (form.touched[arrayName] as FormikTouched<any>[])[arrayIndex]
            : false
        : form.touched[field.name]
    const errors = arrayName && arrayIndex !== undefined
        ? form.errors[arrayName]
            ? (form.errors[arrayName] as FormikErrors<any>[])[arrayIndex]
            : false
        : form.errors[field.name];

    const isInvalid = touched && Boolean(errors);
    const isValid = touched && !Boolean(errors);

    return (
        <>
            <FormControl
                {...field}
                {...rest}
                isInvalid={isInvalid}
                isValid={isValid}
            />

            {isInvalid && (
                <FormControl.Feedback tooltip={true} type={'invalid'}>
                    {errors}
                </FormControl.Feedback>
            )}
        </>
    );
}

export default FormikBSInput;
