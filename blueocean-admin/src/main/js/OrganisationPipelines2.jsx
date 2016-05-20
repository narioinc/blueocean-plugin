import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';
import fetch from 'isomorphic-fetch';
import {ACTION_TYPES} from './PipelineStore2';

const fetchOptions = { credentials: 'same-origin' };
function checkStatus(response) {
    if (response.status >= 300 || response.status < 200) {
        const error = new Error(response.statusText);
        error.response = response;
        throw error;
    }
    return response;
}

function parseJSON(response) {
    return response.json();
}

const actions = {
    clearPipelinesData: () => ({type: ACTION_TYPES.CLEAR_PIPELINES_DATA2}),

    fetchPipelinesIfNeeded(config) {
        return (dispatch, getState) => {
            const pipelines = getState().adminStore.pipelines;
            const url = `${config.getAppURLBase()}` +
                '/rest/organizations/jenkins/pipelines/';
            if (!pipelines) {
                return dispatch(actions.generateData(
                    url,
                    ACTION_TYPES.SET_PIPELINES_DATA2
                ));
            }
            return pipelines;
        };
    },

    generateData(url, actionType, optional) {
        return (dispatch) => fetch(url, fetchOptions)
            .then(checkStatus)
            .then(parseJSON)
            .then(json => dispatch({
                ...optional,
                type: actionType,
                payload: json,
            }))
            .catch(() => dispatch({
                ...optional,
                payload: null,
                type: actionType,
            }));
    },
};

const testStore = state => state.testStore;
const location = (state) => state.location;
export const previous = createSelector([location], store => store.previous);
export const current = createSelector([location], store => store.current);
export const pipelinesSelector = createSelector([testStore], store => store.pipelines);


class OrganisationPipelines2 extends Component {

    getChildContext() {
        const {
            params,
            location,
            pipelines,
        } = this.props;

        // The specific pipeline we may be focused on
        let pipeline;

        if (pipelines && params && params.pipeline) {
            const name = params.pipeline;
            pipeline = pipelines.find(aPipeLine => aPipeLine.name === name);
        }

        return {
            pipelines,
            pipeline,
            params,
            location,
        };
    }

    componentWillMount() {
        if (this.context.config) {
            setTimeout(() => (
                this.props.fetchPipelinesIfNeeded(this.context.config)
            ), 2000);
        }
    }

    render() {
        return this.props.children; // Set by router
    }
}

OrganisationPipelines2.contextTypes = {
    router: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
};

OrganisationPipelines2.propTypes = {
    fetchPipelinesIfNeeded: PropTypes.func.isRequired,
    params: PropTypes.object, // From react-router
    children: PropTypes.node, // From react-router
    location: PropTypes.object, // From react-router
    pipelines: PropTypes.array,
};

OrganisationPipelines2.childContextTypes = {
    pipelines: PropTypes.array,
    pipeline: PropTypes.object,
    params: PropTypes.object, // From react-router
    location: PropTypes.object, // From react-router
};

const selectors = createSelector([pipelinesSelector], (pipelines) => ({ pipelines }));

export default connect(selectors, actions)(OrganisationPipelines2);