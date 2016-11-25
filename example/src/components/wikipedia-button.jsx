import React from 'react';
import WikipediaImporter from '../importers/wikipedia';

export default class WikipediaButton extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      running: false,
      count: 0,
    };

    this.importer = new WikipediaImporter();
    this.importer.on('updated', this._onImporterUpdate);
  }

  componentWillUnmount() {
    this.importer.removeEventListener('updated', this._onImporterUpdate);
    this.importer.cancel();
  }

  _onImporterUpdate = () => {
    this.setState({
      count: this.importer.count,
      running: this.importer.running,
    });
  }

  render() {
    if (this.state.running) {
      return (
        <button className="wikipedia running" onClick={() => this.importer.cancel()}>
          {this.state.count}
        </button>
      );
    }

    return (
      <button className="wikipedia" onClick={() => this.importer.run()}>
        W
      </button>
    );
  }
}
