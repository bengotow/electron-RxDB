import React from 'react';

import Sidebar from '../components/sidebar';
import Detail from '../components/detail';
import Note from '../models/note';

export default class Container extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      items: [],
      selectedItem: null,
    };
  }

  componentDidMount() {
    const query = window.Database
      .findAll(Note)
      .order(Note.attributes.createdAt.descending());

    this._unsubscribe = query.observe().subscribe((nextItems) => {
      this.setState({
        items: nextItems,
        selectedItem: this._nextSelectedItem(nextItems),
      });
    });
  }

  componentWillUnmount() {
    this._unsubscribe();
  }

  _nextSelectedItem(nextItems) {
    let {selectedItem} = this.state;

    if (selectedItem) {
      const oldIndex = this.state.items.findIndex(({id}) => selectedItem.id === id);
      const nextIndex = nextItems.findIndex(({id}) => selectedItem.id === id);
      if (nextIndex === -1) {
        selectedItem = nextItems[oldIndex] || nextItems[oldIndex - 1] || nextItems[oldIndex + 1];
      }
    }
  }

  _onSelectItem = (item) => {
    this.setState({selectedItem: item});
  }

  _onCreateItem = () => {
    const item = new Note({
      name: 'Untitled',
      content: 'Write your note here!',
      createdAt: new Date(),
    });
    window.Database.inTransaction((t) => {
      return t.persistModel(item);
    });
  }

  render() {
    return (
      <div className="container">
        <Sidebar
          items={this.state.items}
          selectedItem={this.state.selectedItem}
          onSelect={this._onSelectItem}
        />
        <Detail item={this.state.selectedItem} />
        <div className="floating">
          <button onClick={this._onCreateItem}>➕</button>
        </div>
      </div>
    )
  }
}
