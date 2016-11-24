import React from 'react';

import Sidebar from '../components/sidebar';
import Detail from '../components/detail';
import Note from '../models/note';

export default class Container extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      items: [],
      searchValue: null,
      selectedId: -1,
    };
  }

  componentDidMount() {
    const query = window.Database
      .findAll(Note)
      .order(Note.attributes.createdAt.descending());

    this._unsubscribe = query.observe().subscribe((nextItems) => {
      this.setState({items: nextItems});
    });
  }

  componentWillUnmount() {
    this._unsubscribe();
  }

  _onSearchChange = (event) => {
    this.setState({searchValue: event.target.value});
  }

  _onSelectItem = (item) => {
    this.setState({selectedId: item.id});
  }

  _onCreateItem = () => {
    const item = new Note({
      name: 'Untitled',
      content: 'Write your note here!',
      createdAt: new Date(),
    });
    window.Database.inTransaction((t) => {
      return t.persistModel(item);
    }).then(() => {
      this.setState({
        selectedId: item.id,
        searchValue: null,
      });
    });
  }

  render() {
    const {items, selectedId, searchValue} = this.state;
    const selected = items.find(i => i.id === selectedId);

    return (
      <div className="container">
        <input type="search" onChange={this._onSearchChange} value={this.state.search} />
        <Sidebar
          items={items}
          selectedItem={selected}
          onSelect={this._onSelectItem}
        />
        <Detail item={selected} />
        <div className="floating">
          <button title="Add Note..." onClick={this._onCreateItem} />
        </div>
      </div>
    )
  }
}
