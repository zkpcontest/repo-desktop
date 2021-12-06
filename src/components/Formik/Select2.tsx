import React from "react";
import Select from "react-select";
import {PublicBaseSelectProps} from "react-select/base";
import {FieldProps} from "formik";
import {FormControl} from "react-bootstrap";


interface IFormikSelect2Props extends FieldProps {
    select2Props: PublicBaseSelectProps<any, any, any>;
}

const FormikSelect2 = (props: IFormikSelect2Props) => {
    const {select2Props, field, form} = props;
    const {className} = select2Props;
    const isInvalid = form.touched[field.name] && Boolean(form.errors[field.name]);
    const isValid = form.touched[field.name] && !Boolean(form.errors[field.name]);

    const classNames = [
        'select2',
        className,
        isInvalid ? 'is-invalid' : undefined,
        isValid ? 'is-valid' : undefined
    ]

    return (
        <>
            <Select
                {...select2Props}
                classNamePrefix={'select2'}
                className={classNames.filter((value => value !== undefined)).join(' ')}
                onChange={(newValue: any) => {
                    form.setFieldValue(field.name, newValue);
                }}
                onFocus={() => {
                    form.setFieldTouched(field.name, true, false);
                }}
                onBlur={() => {
                    form.validateField(field.name)
                }}
            />

            {isInvalid && (
                <FormControl.Feedback tooltip={true} type={'invalid'}>
                    {form.errors[field.name]}
                </FormControl.Feedback>
            )}
        </>
    );
}

export default FormikSelect2;
