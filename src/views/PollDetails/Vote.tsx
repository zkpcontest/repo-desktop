import React, {useEffect, useState} from "react";
import {Card, CardProps, Form, Button, Row, Col, InputGroup, FormControl, FloatingLabel} from "react-bootstrap";
import {Formik, FormikValues, Field, FormikHelpers} from "formik";
import * as Yup from 'yup';
import FormikBSInput from "../../components/Formik/BSInput";
import FormikSelect2 from "../../components/Formik/Select2";
import {faSpinner} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {EContractType, IPoll} from "devex-common/types";
import {toast} from "react-toastify";
import * as nodePath from "path";


interface IPollVoteProps {
    poll: IPoll;
    cardProps?: CardProps;

    getPoll(): Promise<void>;
}

const PollVote = (props: IPollVoteProps) => {
    const {poll, cardProps, getPoll} = props;
    const {everscale, crypto, fs, zkp, getPath} = (window as any).electron;
    const [pkeyPath, setPkeyPath] = useState<string>('');

    /**
     * File open handler
     */
    const onFileOpenHandler = async () => {
        const path = await (window as any).electron.openDialogSync(['openFile']);
        if (path) setPkeyPath(path.toString());
    }

    /**
     * Vote form submit handler
     * @param values
     * @param formikHelpers
     */
    const onSubmitHandler = async (values: FormikValues, formikHelpers: FormikHelpers<any>) => {
        const id = toast.loading('Preparing vote');

        try {
            // Get poll RSA public key and create RSA key object
            let rsaPublic: any = await everscale('accountRunLocal', {
                type: EContractType.PollMaster,
                accountOptions: {address: poll.address},
                runOptions: {
                    function_name: 'open',
                    input: {}
                }
            });
            rsaPublic = rsaPublic.decoded?.output.open;
            rsaPublic = Buffer.from(rsaPublic.toString(), 'hex');
            console.debug('[POLL VOTE]: RSA Public Buffer', rsaPublic);

            // Prepare data and encrypt with RSA public key
            const bytesStart = await everscale('generateRandomBytes', {length: 3});
            const bytesStartHex = Buffer.from(bytesStart.bytes, 'base64').toString('hex');
            console.debug('[POLL VOTE]: Bytes start', bytesStart, bytesStartHex);

            const bytesEnd = await everscale('generateRandomBytes', {length: 3});
            const bytesEndHex = Buffer.from(bytesEnd.bytes, 'base64').toString('hex');
            console.debug('[POLL VOTE]: Bytes end', bytesEnd, bytesEndHex);

            const answers = values.answers
                .map((option: any) => option.value)
                .join(Buffer.from('|', 'utf8').toString('hex'));
            console.debug('[POLL VOTE]: Answers hex', answers);
            const encrypted = crypto.publicEncrypt(
                {
                    key: rsaPublic,
                    format: 'der',
                    type: 'spki',
                    padding: crypto.constants.RSA_PKCS1_PADDING
                },
                Buffer.from(`${bytesStartHex}${answers}${bytesEndHex}`, 'hex')
            );
            console.debug('[POLL VOTE]: Answers encrypted', encrypted);

            // Generate `ZKP` proof
            const cwdPath = nodePath.dirname(pkeyPath);
            const files = fs.readdirSync(cwdPath);
            let proof;
            if (files.indexOf('proof') >= 0) proof = fs.readFileSync(nodePath.join(cwdPath, 'proof'));
            else proof = await zkp.proof(cwdPath, values.key);
            console.debug('[POLL VOTE]: ZKP proof', proof, Buffer.from(proof).toString('hex'));

            // Send vote message to the network
            toast.update(id, {render: 'Sending vote'});
            const message = await everscale('accountRun', {
                type: EContractType.PollMaster,
                accountOptions: {address: poll.address},
                runOptions: {
                    function_name: 'vote',
                    input: {
                        proof: Buffer.from(proof).toString('hex'),
                        ballot_number: values.key,
                        vote: Buffer.from(encrypted).toString('hex')
                    }
                }
            });
            console.debug('[POLL VOTE]: Send message result', message);

            formikHelpers.resetForm({});
            await getDefaultDataPath();
            toast.update(id, {
                render: 'Vote successfully sent',
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

    /**
     * Get default data path
     */
    const getDefaultDataPath = React.useCallback(async () => {
        const path = await getPath('documents');
        setPkeyPath(path.toString());
    }, [getPath]);

    /**
     * Effect on component render
     */
    useEffect(() => {
        getDefaultDataPath().then();
    }, [getDefaultDataPath]);

    return (
        <Card {...cardProps}>
            <Card.Header>
                <Card.Title className={'m-0'}>Vote</Card.Title>
            </Card.Header>
            <Card.Body>
                <Formik
                    initialValues={{
                        key: '',
                        answers: []
                    }}
                    validationSchema={Yup.object().shape({
                        key: Yup.number()
                            .typeError('Must be a number')
                            .min(1, 'Must be equal or greater than 1')
                            .max(1290, 'Must be equal or lower than 1290')
                            .required('Field is required'),
                        answers: Yup.array()
                            .min(1, 'At least one answer needed')
                            .of(Yup.object())
                    })}
                    onSubmit={onSubmitHandler}
                >
                    {({
                          handleSubmit,
                          handleReset,
                          isSubmitting,
                          values
                    }) => (
                        <Form onSubmit={handleSubmit} onReset={handleReset}>
                            <Row className={'flex-nowrap'}>
                                <Col xs={8}>
                                    <Form.Group>
                                        <InputGroup>
                                            <FloatingLabel
                                                className={'flex-grow-1'}
                                                label={(
                                                    <>
                                                        Path to poll
                                                        <span className={'font-monospace fw-bold px-1'}>p_key</span>
                                                        file
                                                    </>
                                                )}
                                            >
                                                <FormControl
                                                    placeholder={'Path to poll p_key file'}
                                                    readOnly={true}
                                                    defaultValue={pkeyPath}
                                                    onClick={onFileOpenHandler}
                                                />
                                            </FloatingLabel>
                                            <Button
                                                variant={'secondary'}
                                                disabled={isSubmitting}
                                                onClick={onFileOpenHandler}
                                            >
                                                Choose
                                            </Button>
                                        </InputGroup>
                                    </Form.Group>
                                </Col>
                                <Col xs={4}>
                                    <Form.Group className={'position-relative'} as={'div'}>
                                        <FloatingLabel label={'Voter\'s private key'}>
                                            <Field
                                                name={'key'}
                                                placeholder={'Voter\'s private key'}
                                                component={FormikBSInput}
                                                disabled={isSubmitting}
                                            />
                                        </FloatingLabel>
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row className={'mt-3'}>
                                <Col>
                                    <Form.Group className={'position-relative flex-grow-1'} as={'div'}>
                                        <Field
                                            name={'answers'}
                                            component={FormikSelect2}
                                            select2Props={{
                                                options: poll.answers?.map((answer) => ({
                                                    label: answer.utf8,
                                                    value: answer.hex
                                                })),
                                                isMulti: true,
                                                isDisabled: isSubmitting,
                                                placeholder: 'Select answer(s)',
                                                menuPlacement: 'auto',
                                                noOptionsMessage: 'No answers available',
                                                value: values.answers
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <div className={'mt-3 text-end'}>
                                <Button
                                    type={'submit'}
                                    variant={'success'}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting && (
                                        <FontAwesomeIcon icon={faSpinner} className={'me-1'} spin={true}/>
                                    )}
                                    Submit vote
                                </Button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </Card.Body>
        </Card>
    );
}

export default PollVote;
