import React, {useState} from 'react';
import './assets/styles.scss';
import {Nav, Tab} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faToolbox, faPlusSquare, faListUl, faFileAlt} from "@fortawesome/free-solid-svg-icons";
import ToolsView from "./views/Tools";
import PollCreateView from "./views/PollCreate";
import {ToastContainer} from "react-toastify";
import PollListView from "./views/PollList";
import PollDetailsView from "./views/PollDetails";


export interface IActiveTab {
    id: string | null | undefined;
    props?: any;
}

const App = () => {
    const [activeTab, setActiveTab] = useState<IActiveTab>({id: 'pollList'});
    const {debug} = (window as any).electron;

    return (
        <Tab.Container
            activeKey={activeTab?.id ?? ''}
            onSelect={(key) => setActiveTab({id: key})}
        >
            <div className={'d-flex flex-row flex-nowrap vh-100'}>
                <aside className={'sidebar bg-light shadow-sm'}>
                    <h4 id={'brand'} className={'text-center text-secondary mb-3'}>
                        DevEx Tools
                        <div style={{fontSize: '0.5rem'}} className={'text-muted fw-lighter'}>{debug}</div>
                    </h4>
                    <Nav
                        activeKey={activeTab?.id ?? undefined}
                        className={'flex-column'}
                    >
                        <Nav.Link eventKey={'pollCreate'} disabled={activeTab?.id === 'pollCreate'}>
                            <FontAwesomeIcon icon={faPlusSquare} fixedWidth={true} className={'me-1'}/>
                            Create poll
                        </Nav.Link>
                        <Nav.Link eventKey={'pollList'} disabled={activeTab?.id === 'pollList'}>
                            <FontAwesomeIcon icon={faListUl} fixedWidth={true} className={'me-1'}/>
                            Polls list
                        </Nav.Link>
                        <Nav.Link eventKey={'pollDetails'} disabled={activeTab?.id === 'pollDetails'}>
                            <FontAwesomeIcon icon={faFileAlt} fixedWidth={true} className={'me-1'}/>
                            Poll details
                        </Nav.Link>
                        <Nav.Link eventKey={'tools'} disabled={activeTab?.id === 'tools'}>
                            <FontAwesomeIcon icon={faToolbox} fixedWidth={true} className={'me-1'}/>
                            Tools
                        </Nav.Link>
                    </Nav>
                </aside>
                <section className={'content flex-grow-1 px-4 pb-3'}>
                    <Tab.Content>
                        <Tab.Pane eventKey={'pollCreate'}>
                            <PollCreateView {...activeTab?.props}/>
                        </Tab.Pane>
                        <Tab.Pane eventKey={'pollList'}>
                            <PollListView
                                setActiveTab={setActiveTab}
                                isActive={activeTab?.id === 'pollList'}
                                {...activeTab?.props}
                            />
                        </Tab.Pane>
                        <Tab.Pane eventKey={'pollDetails'}>
                            <PollDetailsView {...activeTab?.props}/>
                        </Tab.Pane>
                        <Tab.Pane eventKey={'tools'}>
                            <ToolsView {...activeTab?.props}/>
                        </Tab.Pane>
                    </Tab.Content>
                </section>
            </div>

            <ToastContainer theme={'light'} autoClose={2000}/>
        </Tab.Container>
    );
}

export default App;
