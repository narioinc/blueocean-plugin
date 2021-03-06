import React, { Component, PropTypes } from 'react';
import { EmptyStateView, Table } from '@jenkins-cd/design-language';
import Branches from './Branches';
import { RunsRecord } from './records';
import {
    actions,
    currentBranches as branchSelector,
    createSelector,
    connect,
} from '../redux';

const { object, array, func, string, any } = PropTypes;

const EmptyState = ({ repoName }) => (
    <main>
        <EmptyStateView iconName="branch">
            <h1>Branch out</h1>

            <p>
                Create a branch in the repository <em>{repoName}</em> and
                Jenkins will start testing your changes.
            </p>

            <p>
                Give it a try and become a hero to your team.
            </p>

            <button>Enable</button>
        </EmptyStateView>
    </main>
);

const NotSupported = () => (
    <main>
        <EmptyStateView>
            <h1>Branches are unsupported</h1>
            <p>
            Branch builds only work with the <i>Multibranch Pipeline</i> job type.
            This is just one of the many reasons to switch to Jenkins Pipeline.
            </p>
            <a href="https://jenkins.io/doc/book/pipeline-as-code/" target="_blank">Learn more</a>
        </EmptyStateView>
    </main>
);

EmptyState.propTypes = {
    repoName: string,
};

export class MultiBranch extends Component {
    constructor(props) {
        super(props);
        this.state = {
            unsupportedJob: false,
        };
    }

    componentWillMount() {
        if (this.context.config && this.context.params) {
            const {
                pipeline,
            } = this.context;

            if (!pipeline.branchNames || !pipeline.branchNames.length) {
                this.setState({
                    unsupportedJob: true,
                });
                return;
            }

            this.props.fetchBranches({
                organizationName: this.context.params.organization,
                pipelineName: this.context.params.pipeline,
            });
        }
    }

    render() {
        const { branches } = this.props;

        if (this.state.unsupportedJob) {
            return (<NotSupported />);
        }

        // early out
        if (!branches) {
            return null;
        }

        if (branches.$pending) {
            return null;
        }

        if (branches.$failed) {
            return <div>ERROR: {branches.$failed}</div>;
        }

        if (!branches.length) {
            return (<EmptyState repoName={this.context.params.pipeline} />);
        }

        const headers = [
            'Health',
            'Status',
            { label: 'Branch', className: 'branch' },
            { label: 'Last commit', className: 'lastcommit' },
            { label: 'Latest message', className: 'message' },
            { label: 'Completed', className: 'completed' },
            { label: '', className: 'run' },
        ];

        return (
            <main>
                <article>
                    <Table className="multibranch-table fixed"
                      headers={headers}
                    >
                        {branches.map((run, index) => {
                            const result = new RunsRecord(run);
                            return (<Branches
                              key={index}
                              data={result}
                            />);
                        })
                        }
                    </Table>
                    {branches.$pager &&
                        <button disabled={!branches.$pager.hasMore} className="btn-show-more btn-secondary" onClick={() => branches.$pager.fetchMore()}>
                            {branches.$pending ? 'Loading...' : 'Show More'}
                        </button>
                    }
                </article>
                {this.props.children}
            </main>
        );
    }
}

MultiBranch.contextTypes = {
    config: object.isRequired,
    params: object.isRequired,
    pipeline: object,
};

MultiBranch.propTypes = {
    branches: array,
    fetchBranches: func,
    children: any,
};

const selectors = createSelector([branchSelector], (branches) => ({ branches }));

export default connect(selectors, actions)(MultiBranch);
