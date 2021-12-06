import React, {useState} from "react";
import {
    Accordion,
    Alert,
    Button,
    ButtonGroup,
    FloatingLabel,
    FormControl,
    FormGroup
} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faSync, faSave} from "@fortawesome/free-solid-svg-icons";


const ToolsView = () => {
    const [personalKeys, setPersonalKeys] = useState<{secret: number; public: number}>();
    const {saveDialogSync} = (window as any).electron;

    /**
     * Generate voter personal keys
     */
    const generatePersonalKeys = () => {
        let prv = 0;
        while (prv === 0 || prv > 1290) {
            prv = Math.round(Math.random() * 1000);
        }
        const pub = Math.pow(prv, 3) + prv;
        setPersonalKeys({secret: prv, public: pub});
    }

    /**
     * Save dialog handler
     */
    const saveDialogHandler = async (filename?: string) => {
        await saveDialogSync(JSON.stringify(personalKeys), filename);
    }

    return (
        <>
            <h4 className={'text-secondary py-3 mb-3 sticky-top bg-white d-flex align-items-center border-bottom'}>
                Tools
            </h4>

            <Accordion defaultActiveKey={'0'}>
                <Accordion.Item eventKey={'0'}>
                    <Accordion.Header>Generate personal keys</Accordion.Header>
                    <Accordion.Body>
                        <Alert variant={'warning'}>
                            <p>
                                Generate your secret and public keys.<br/>
                                Public key should be transferred to special service which will combine key with
                                your personal data and add it to polls registry.
                            </p>
                            <p className={'mb-0'}>
                                Save generated keys somewhere in your secure place, because you will need it for
                                voting, but app does not store your keys anywhere.
                            </p>
                        </Alert>

                        <div className={'d-flex'}>
                            <FormGroup className={'flex-grow-1 me-3'}>
                                <FloatingLabel label={'Secret key'}>
                                    <FormControl
                                        placeholder={'Secret key'}
                                        readOnly={true}
                                        defaultValue={personalKeys?.secret}
                                    />
                                </FloatingLabel>
                            </FormGroup>

                            <FormGroup className={'flex-grow-1 me-3'}>
                                <FloatingLabel label={'Public key'}>
                                    <FormControl
                                        placeholder={'Public key'}
                                        readOnly={true}
                                        defaultValue={personalKeys?.public}
                                    />
                                </FloatingLabel>
                            </FormGroup>

                            <ButtonGroup>
                                <Button size={'lg'} onClick={generatePersonalKeys}>
                                    <FontAwesomeIcon icon={faSync}/>
                                </Button>

                                <Button
                                    variant={'success'}
                                    size={'lg'}
                                    disabled={!personalKeys}
                                    onClick={async () => {
                                        await saveDialogHandler('DevExVoter.keys.json');
                                        setPersonalKeys(undefined);
                                    }}
                                >
                                    <FontAwesomeIcon icon={faSave}/>
                                </Button>
                            </ButtonGroup>
                        </div>
                    </Accordion.Body>
                </Accordion.Item>
            </Accordion>
        </>
    );
}

export default ToolsView;
