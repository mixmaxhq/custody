import { displayName, effectiveState } from '../../utils/process';
import { HEADERS } from '../ProcessTable';
import PropTypes from 'prop-types';
import React from 'react';

export default function ProcessSummary({ process }) {
  const data = HEADERS.map((key) => {
    let value;

    // Derive the data.
    switch (key) {
      case 'name':
        value = displayName(process);
        break;
      // For state and description, prefer information reported by the child process if available.
      case 'state':
      case 'description':
        value = effectiveState(process)[key];
        break;
      default:
        value = process[key];
        break;
    }

    // Format the data.
    switch (key) {
      case 'state':
        if (value !== 'RUNNING') {
          // Note that this doesn't preserve the inverted background--text colors aren't composited,
          // apparently. We could fix this by wrapping in a background-color tag but I think it's
          // better for contrast to have the normal background.
          value = `{red-fg}${value}{/red-fg}`;
        }
    }

    return value;
  });

  return (
    <table
      data={[data]}
      tags // Enables cell content to contain color tags.
      style={{
        // Mimics the selection in the process table.
        header: { inverse: true }
      }}
      height={1}
    />
  );
}

ProcessSummary.propTypes = {
  process: PropTypes.object.isRequired,
};
