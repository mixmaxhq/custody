import PropTypes from 'prop-types';
import React from 'react';

export default function ProcessSummary({ process }) {
  const keys = ['name', 'state', 'description'];
  const data = keys.map((key) => {
    let value;

    // Derive the data.
    switch (key) {
      // For state and description, prefer information reported by the child process if available.
      case 'state':
        value = process['childState'] || process['state'];
        break;
      case 'description':
        value = process['childDescription'] || process['description'];
        break;
      default:
        value = process[key];
        break;
    }

    // Format the data.
    switch (key) {
      case 'state':
        if (value !== 'RUNNING') {
          // Note that this doesn't preserve the black background--text colors aren't composited,
          // apparently. We could fix this by wrapping in `{black-bg}` but I think it's better for
          // contrast to have white background.
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
        header: { fg: 'white', bg: 'black' }
      }}
      height={1}
    />
  );
}

ProcessSummary.propTypes = {
  process: PropTypes.object.isRequired,
};
