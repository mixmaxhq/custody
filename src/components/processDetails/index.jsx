import Summary from './ProcessSummary';
import Log from './ProcessLog';
import PropTypes from 'prop-types';
import React, { Fragment } from 'react';

export default function ProcessDetails({ process, onClose }) {
  return (
    <Fragment>
      <Summary process={process} />
      {/* HACK(jeff): `top` === the `height` of `Summary`. */}
      <Log process={process} onClose={onClose} layout={{ top: 1 }} />
    </Fragment>
  );
}

ProcessDetails.propTypes = {
  process: PropTypes.object.isRequired,
  onClose: PropTypes.func
};
