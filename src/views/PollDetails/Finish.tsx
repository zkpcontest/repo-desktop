import React from "react";
import {EContractType, IPoll} from "devex-common/types";
import {Button, Card, CardProps, FloatingLabel, Form, InputGroup} from "react-bootstrap";
import {Formik, FormikValues, Field, FormikHelpers} from "formik";
import * as Yup from 'yup';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faSpinner} from "@fortawesome/free-solid-svg-icons";
import FormikBSInput from "../../components/Formik/BSInput";
import {toast} from "react-toastify";


interface IPollFinishProps {
    poll: IPoll;
    cardProps?: CardProps;

    getPoll(): Promise<void>;
}

const PollFinish = (props: IPollFinishProps) => {
    const {poll, cardProps, getPoll} = props;
    const {openDialogSync, fs, crypto, everscale} = (window as any).electron;

    /**
     * File open handler
     */
    const onFileOpenHandler = async (): Promise<string | undefined> => {
        let path = await openDialogSync(['openFile']);
        return path ? path.toString() : undefined;
    }

    /**
     * On poll finish form submit handler
     * @param values
     * @param formikHelpers
     */
    const onSubmitHandler = async (values: FormikValues, formikHelpers: FormikHelpers<any>) => {
        const id = toast.loading('Finishing poll');

        try {
            // Read RSA secret key
            let rsaSecret = fs.readFileSync(values.path);
            console.debug('[POLL FINISH]: RSA Secret', rsaSecret);
            rsaSecret = crypto.createPrivateKey({
                key: rsaSecret,
                format: 'pem'
            });
            console.debug('[POLL FINISH]: RSA Secret DER', rsaSecret);
            rsaSecret = Buffer.from(rsaSecret).toString('hex');
            console.debug('[POLL FINISH]: RSA Secret HEX', rsaSecret);

            // Upload private key to poll contract
            const message = await everscale('accountRun', {
                type: EContractType.PollMaster,
                accountOptions: {address: poll.address},
                runOptions: {
                    function_name: 'finish_vote',
                    input: {
                        _private: rsaSecret
                    }
                }
            });
            console.debug('[POLL FINISH]: Send message result', message);

            formikHelpers.resetForm({});
            toast.update(id, {
                render: 'Poll finished',
                type: toast.TYPE.SUCCESS,
                isLoading: false,
                autoClose: 2000
            });
            await getPoll();
        } catch (e: any) {
            console.error(e.message);
            toast.update(id, {
                render: e.message,
                type: toast.TYPE.ERROR,
                isLoading: false,
                autoClose: 4000
            });
        }
    }

    return (
        <Card {...cardProps}>
            <Card.Header>
                <Card.Title className={'m-0'}>Finish</Card.Title>
            </Card.Header>
            <Card.Body>
                <Formik
                    initialValues={{
                        path: ''
                    }}
                    validationSchema={Yup.object().shape({
                        path: Yup.string().required('Field is required')
                    })}
                    onSubmit={onSubmitHandler}
                >
                    {({
                          handleSubmit,
                          handleReset,
                          isSubmitting,
                          setFieldValue
                    }) => (
                        <Form onSubmit={handleSubmit} onReset={handleReset}>
                            <div className={'d-flex flex-row flex-nowrap'}>
                                <Form.Group className={'position-relative flex-grow-1'}>
                                    <InputGroup>
                                        <FloatingLabel
                                            className={'flex-grow-1'}
                                            label={(
                                                <>
                                                    Path to poll
                                                    <span className={'font-monospace fw-bold px-1'}>rsa.secret.pem</span>
                                                    file
                                                </>
                                            )}
                                        >
                                            <Field
                                                name={'path'}
                                                component={FormikBSInput}
                                                placeholder={'Path to rsa.secret.pem file'}
                                                readOnly={true}
                                                onClick={async () => {
                                                    const path = await onFileOpenHandler();
                                                    setFieldValue('path', path ?? '', true)
                                                }}
                                            />
                                        </FloatingLabel>

                                        <Button
                                            variant={'secondary'}
                                            disabled={isSubmitting}
                                            onClick={async () => {
                                                const path = await onFileOpenHandler();
                                                setFieldValue('path', path ?? '', true)
                                            }}
                                        >
                                            Choose
                                        </Button>

                                        <Button variant={'success'} type={'submit'} disabled={isSubmitting}>
                                            {isSubmitting && (
                                                <FontAwesomeIcon icon={faSpinner} className={'me-1'} spin={true}/>
                                            )}
                                            Finish
                                        </Button>
                                    </InputGroup>
                                </Form.Group>
                            </div>
                        </Form>
                    )}
                </Formik>
            </Card.Body>
        </Card>
    );
}

export default PollFinish;
