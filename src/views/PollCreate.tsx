import React, {useEffect, useState} from "react";
import {Formik, FormikValues, Field, FieldArray, ErrorMessage, FormikHelpers} from "formik";
import {Alert, Button, Col, FloatingLabel, Form, FormControl, InputGroup, Row} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPlus, faTimes, faSave, faSpinner} from "@fortawesome/free-solid-svg-icons";
import * as Yup from 'yup';
import FormikBSInput from "../components/Formik/BSInput";
import FormikDateTimePicker from "../components/Formik/DateTimePicker";
import moment from "moment";
import {toast} from "react-toastify";
import {KeyPair, signerKeys} from "@tonclient/core";
import {EContractType} from "devex-common/types";
import {AccountOptions} from "@tonclient/appkit";


type RSAKeypair = {
    public: number[];
    secret: number[];
}

const PollCreateView = () => {
    const {zkp, crypto, fs, everscale, openDialogSync, getPath} = (window as any).electron;
    const [dataPath, setDataPath] = useState<string>('');
    const [helperAddress, setHelperAddress] = useState<string>();
    const [pollAddress, setPollAddress] = useState<string>();

    /**
     * Execute `zkp --setup`
     * @param files
     */
    const generateZKP = async (files: string[]) => {
        const exists = ['p_key', 'pi', 'proof', 'v_key', 'viout'].map((fn) => files.indexOf(fn) >= 0);
        if (!exists.every((value => value))) {
            console.debug('[ZKP]: Generate new keys');
            await zkp.setup(dataPath);
        } else console.debug('[ZKP]: All files are present, generation skipped');
    }

    /**
     * Generate/read RSA keypair
     * @param files
     */
    const generateRSA = (files: string[]): RSAKeypair => {
        const exists = ['rsa.public.pem', 'rsa.secret.pem'].map((fn) => files.indexOf(fn) >= 0);
        if (!exists.every((value => value))) {
            console.debug('[RSA]: Generate new keys');
            return crypto.generateRSAKeyPairSync(dataPath);
        }

        // Read keys
        console.debug('[RSA]: All files are present, generation skipped, read files...');
        const pubData = fs.readFileSync(`${dataPath}/rsa.public.pem`);
        const pub = crypto.createPublicKey({
            key: pubData,
            format: 'pem'
        });

        const prvData = fs.readFileSync(`${dataPath}/rsa.secret.pem`);
        const prv = crypto.createPrivateKey({
            key: prvData,
            format: 'pem'
        });
        return {public: pub, secret: prv};
    }

    /**
     * Generate everscale random sign keys
     * @param files
     */
    const generateSigningKeys = async (files: string[]): Promise<KeyPair> => {
        const filename = 'signer.keys.json';
        if (files.indexOf(filename) < 0) {
            console.debug('[SIGNER]: Generate new keys');
            const keypair = await everscale('generateRandomSignKeys');
            if (!keypair) throw new Error('[SIGNER]: Error generating random sign keys');

            fs.writeFileSync(`${dataPath}/${filename}`, JSON.stringify(keypair), {encoding: 'utf8'});
            return keypair;
        }

        // Read keys
        console.debug('[SIGNER]: All files are present, generation skipped, read files...');
        const data = fs.readFileSync(`${dataPath}/signer.keys.json`, {encoding: 'utf8'});
        return JSON.parse(data);
    }

    /**
     * Deploy poll contract
     * @param values
     * @param rsaKeypair
     * @param helper
     * @param accountOptions
     */
    const deployPollContract = async (
        values: FormikValues, rsaKeypair: RSAKeypair, helper: string,
        accountOptions: {type: EContractType, options?: AccountOptions}
    ): Promise<string> => {
        // Prepare data for contract deployment
        const ending = moment(values.ending).unix();
        const answers = values.answers.map((answer: string) => Buffer.from(answer).toString('hex'));

        let proofKey = (window as any).electron.fs.readFileSync(`${dataPath}/p_key`);
        proofKey = Buffer.from(proofKey).toString('hex');

        let verifyKey = (window as any).electron.fs.readFileSync(`${dataPath}/v_key`);
        verifyKey = Buffer.from(verifyKey).toString('hex');

        const rsaSecretHash = await everscale('accountRunLocal', {
            type: EContractType.PollHelper,
            accountOptions: {address: helper},
            runOptions: {
                function_name: 'sha256_private',
                input: {_private: Buffer.from(rsaKeypair.secret).toString('hex')}
            }
        });
        if (!rsaSecretHash.decoded?.output._hash) throw new Error('Error in get RSA private key hash');

        console.debug('[CREATE POLL]: Ending', ending);
        console.debug('[CREATE POLL]: Answers', answers);
        console.debug('[CREATE POLL]: Voters', values.voters);
        console.debug('[CREATE POLL]: Proof key', proofKey);
        console.debug('[CREATE POLL]: Verify key', verifyKey);
        console.debug('[CREATE POLL]: RSA keypair', rsaKeypair);
        console.debug('[CREATE POLL]: RSA secret hash', rsaSecretHash.decoded.output._hash);

        // Deploy contract
        const address = await everscale('accountDeploy', {
            type: accountOptions.type,
            accountOptions: accountOptions.options,
            deployOptions: {
                initInput: {
                    _open: Buffer.from(rsaKeypair.public).toString('hex'),
                    _hash_private: rsaSecretHash.decoded.output._hash,
                    _ballot_numbers: values.voters,
                    _time_limit: ending,
                    _m_vkey: verifyKey,
                    _m_pkey: proofKey,
                    _available_choose: answers
                }
            }
        });

        // Save poll data to file
        fs.writeFileSync(
            `${dataPath}/poll.json`,
            JSON.stringify({
                helper,
                address,
                ending: {
                    unixtime: ending,
                    verbose: values.ending
                },
                answers: values.answers,
                voters: values.voters
            }),
            {encoding: 'utf8'}
        );
        return address;
    }

    /**
     * Form submit handler
     * @param values
     * @param formikHelpers
     */
    const onSubmitHandler = async (values: FormikValues, formikHelpers: FormikHelpers<any>) => {
        const id = toast.loading('Creating poll');

        try {
            // Read `keyspath` directory
            const files = fs.readdirSync(dataPath);

            // Generate `ZKP` keys
            toast.update(id, {render: 'Generating ZKP keys'});
            await generateZKP(files);

            // Generate `RSA` keys
            toast.update(id, {render: 'Generating RSA keys'});
            const rsaKeypair = generateRSA(files);

            // Generate contract's signing keypair
            const signingKeypair = await generateSigningKeys(files);
            const signer = signerKeys(signingKeypair);

            // Deploy helper contract
            const helperAccountOptions = {type: EContractType.PollHelper, options: {signer}};
            toast.update(id, {render: 'Deploying helper contract'});
            setHelperAddress(await everscale('accountAddress', helperAccountOptions));
            const {type, options} = helperAccountOptions;
            const _helper = await everscale('accountDeploy', {type, accountOptions: options});

            // Deploy poll contract
            toast.update(id, {render: 'Deploying poll contract'});
            const pollAccountOptions = {type: EContractType.PollMaster, options: {signer}};
            setPollAddress(await everscale('accountAddress', pollAccountOptions));
            await deployPollContract(values, rsaKeypair, _helper, pollAccountOptions);

            formikHelpers.resetForm({});
            setHelperAddress(undefined);
            setPollAddress(undefined);
            await getDefaultDataPath();
            toast.update(id, {
                render: 'Poll created',
                type: toast.TYPE.SUCCESS,
                isLoading: false,
                autoClose: 2000
            });
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
     * Directory open handler
     */
    const onDirOpenHandler = async () => {
        const path = await openDialogSync(['openDirectory']);
        if (path) setDataPath(path.toString());
    }

    /**
     * Get default data path
     */
    const getDefaultDataPath = React.useCallback(async () => {
        const path = await getPath('documents');
        setDataPath(path.toString());
    }, [getPath]);

    /**
     * Set default data path on component render
     */
    useEffect(() => {
        getDefaultDataPath().then();
    }, [getDefaultDataPath]);

    return (
        <>
            <h4 className={'text-secondary py-3 mb-3 sticky-top bg-white d-flex align-items-center border-bottom'}>
                Create new poll
            </h4>

            <Alert variant={'info'}>
                <Alert.Heading as={'h5'}>Short information</Alert.Heading>
                <ul className={'m-0'}>
                    <li>
                        Poll data will be saved to selected directory.<br/>
                        <b>Advice:</b> create separate directory for each poll
                    </li>
                    <li>Send<span className={'font-monospace fw-bold small px-1'}>p_key</span>file to each voter</li>
                    <li>Once voting end time is reached, finish poll manually</li>
                    <li>
                        You can find all poll data in
                        <span className={'font-monospace fw-bold small px-1'}>poll.json</span>
                        file after poll was successfully saved
                    </li>
                    <li>
                        Helper address:<br/>
                        <span className={'font-monospace fw-bold small'}>
                            {helperAddress ? helperAddress : 'Not deployed yet'}
                        </span>
                    </li>
                    <li>
                        Poll address:<br/>
                        <span className={'font-monospace fw-bold small'}>
                            {pollAddress ? pollAddress : 'Not deployed yet'}
                        </span>
                    </li>
                </ul>
            </Alert>

            <Formik
                initialValues={{
                    ending: '',
                    voters: [],
                    answers: []
                }}
                validationSchema={Yup.object().shape({
                    ending: Yup.string().required('Field is required'),
                    voters: Yup.array()
                        .min(1, 'At least one voter needed')
                        .max(100, 'Max voters number reached')
                        .of(
                            Yup.number()
                                .typeError('Must be a number')
                                .min(1, 'Must be equal or greater than 1')
                                .required('Field is required')
                        ),
                    answers: Yup.array()
                        .min(1, 'At least one answer needed')
                        .of(
                            Yup.string().required('Field is required')
                        )
                })}
                onSubmit={onSubmitHandler}
            >
                {({
                      handleSubmit,
                      handleReset,
                      values,
                      isSubmitting,
                      errors
                }) => (
                    <Form onSubmit={handleSubmit} onReset={handleReset}>
                        <Row>
                            <Col xs={7} lg={9}>
                                <Form.Group>
                                    <InputGroup>
                                        <FloatingLabel
                                            label={'Path to store poll data in'}
                                            className={'flex-grow-1'}
                                        >
                                            <FormControl
                                                placeholder={'Path to store poll data in'}
                                                readOnly={true}
                                                defaultValue={dataPath}
                                                onClick={onDirOpenHandler}
                                            />
                                        </FloatingLabel>
                                        <Button
                                            variant={'secondary'}
                                            disabled={isSubmitting}
                                            onClick={onDirOpenHandler}
                                        >
                                            Choose
                                        </Button>
                                    </InputGroup>
                                </Form.Group>
                            </Col>
                            <Col xs={5} lg={3}>
                                <Form.Group className={'position-relative'}>
                                    <Field
                                        name={'ending'}
                                        placeholder={'Ending date'}
                                        component={FormikDateTimePicker}
                                        disabled={isSubmitting}
                                        pickerProps={{
                                            timeFormat: false,
                                            closeOnSelect: true,
                                            isValidDate: (current: moment.Moment) => {
                                                return current.isAfter(moment());
                                            }
                                        }}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row className={'mt-3'}>
                            <Col xs={7} lg={9}>
                                <Form.Group>
                                    <Form.Label className={'mb-0'}>Answers</Form.Label>

                                    {!values.answers.length && errors.answers && (
                                        <div className={'small text-danger'}>
                                            <ErrorMessage name={'answers'}/>
                                        </div>
                                    )}

                                    <FieldArray name={'answers'}>
                                        {(arrayHelpers) => (
                                            <div className={'mt-2'}>
                                                {values.answers.map((answer, index) => (
                                                    <div
                                                        key={index}
                                                        className={'d-flex flex-row align-items-center mb-2 position-relative'}
                                                    >
                                                        <Field
                                                            name={`answers.${index}`}
                                                            component={FormikBSInput}
                                                            disabled={isSubmitting}
                                                            placeholder={'Input single answer'}
                                                            arrayName={'answers'}
                                                            arrayIndex={index}
                                                        />
                                                        <Button
                                                            variant={'outline-danger'}
                                                            className={'ms-3'}
                                                            disabled={isSubmitting}
                                                            onClick={() => arrayHelpers.remove(index)}
                                                        >
                                                            <FontAwesomeIcon icon={faTimes}/>
                                                        </Button>
                                                    </div>
                                                ))}

                                                <Button
                                                    variant={'outline-secondary'}
                                                    size={'sm'}
                                                    disabled={isSubmitting}
                                                    onClick={() => arrayHelpers.push('')}
                                                >
                                                    <FontAwesomeIcon icon={faPlus} className={'me-2'}/>
                                                    Add answer
                                                </Button>
                                            </div>
                                        )}
                                    </FieldArray>
                                </Form.Group>
                            </Col>
                            <Col xs={5} lg={3}>
                                <Form.Group>
                                    <Form.Label className={'mb-0'}>Voters</Form.Label>

                                    {!values.voters.length && errors.voters && (
                                        <div className={'small text-danger'}>
                                            <ErrorMessage name={'voters'}/>
                                        </div>
                                    )}

                                    <FieldArray name={'voters'}>
                                        {(arrayHelpers) => (
                                            <div className={'mt-2'}>
                                                {values.voters.map((answer, index) => (
                                                    <div
                                                        key={index}
                                                        className={'d-flex flex-row align-items-center mb-2 position-relative'}
                                                    >
                                                        <Field
                                                            name={`voters.${index}`}
                                                            component={FormikBSInput}
                                                            disabled={isSubmitting}
                                                            placeholder={'Input voter\'s public key'}
                                                            arrayName={'voters'}
                                                            arrayIndex={index}
                                                        />
                                                        <Button
                                                            variant={'outline-danger'}
                                                            className={'ms-3'}
                                                            disabled={isSubmitting}
                                                            onClick={() => arrayHelpers.remove(index)}
                                                        >
                                                            <FontAwesomeIcon icon={faTimes}/>
                                                        </Button>
                                                    </div>
                                                ))}

                                                <Button
                                                    variant={'outline-secondary'}
                                                    size={'sm'}
                                                    disabled={isSubmitting}
                                                    onClick={() => arrayHelpers.push('')}
                                                >
                                                    <FontAwesomeIcon icon={faPlus} className={'me-2'}/>
                                                    Add voter
                                                </Button>
                                            </div>
                                        )}
                                    </FieldArray>
                                </Form.Group>
                            </Col>
                        </Row>

                        <div className={'mt-3 text-end'}>
                            <Button
                                variant={'success'}
                                type={'submit'}
                                disabled={isSubmitting}
                            >
                                <FontAwesomeIcon
                                    icon={isSubmitting ? faSpinner : faSave} className={'me-1'}
                                    spin={isSubmitting}
                                />
                                Create poll
                            </Button>
                        </div>
                    </Form>
                )}
            </Formik>
        </>
    );
}

export default PollCreateView;
