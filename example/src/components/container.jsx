import React from 'react';
import WikipediaButton from './wikipedia-button'

import SidebarSearchResults from '../components/sidebar-search-results';
import SidebarRecents from '../components/sidebar-recents';
import Detail from '../components/detail';
import Note from '../models/note';

export default class Container extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedId: null,
      searchValue: '',
    };
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
      updatedAt: new Date(),
    });

    window.Database.inTransaction((t) => {
      return t.persistModel(item);
    }).then(() => {
      this.setState({
        selectedId: item.id,
        searchValue: '',
      });
    });
  }

  render() {
    const {selectedId, searchValue} = this.state;

    return (
      <div className="container">
        <div className="sidebar">
          <div className="search">
            <input
              type="search"
              placeholder="Search notes..."
              onChange={this._onSearchChange}
              value={searchValue}
            />
          </div>
          <SidebarSearchResults
            searchValue={searchValue}
            selectedId={selectedId}
            onSelectItem={this._onSelectItem}
          />
          <SidebarRecents
            onSelectItem={this._onSelectItem}
          />
        </div>
        <Detail itemId={selectedId} />
        <div className="floating">
          <WikipediaButton />
          <button
            className="add"
            title="Add Note..."
            onClick={this._onCreateItem}
          />
        </div>
      </div>
    )
  }
}
