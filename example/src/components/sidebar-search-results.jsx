import React from 'react';

import SidebarItem from '../components/sidebar-item';
import Note from '../models/note';

export default class SidebarSearchResults extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      items: [],
    };
  }

  componentDidMount() {
    this._updateQuery(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this._updateQuery(nextProps);
  }

  componentWillUnmount() {
    this._observable.dispose();
  }

  _updateQuery = ({searchValue}) => {
    const query = window.Database
      .findAll(Note)
      .order(Note.attributes.name.ascending())

    // Don't load / display > 1000 rows - DOM will start to become heavy. Need
    // to expand this demo to show MutableQuerySubscription "replaceRange" for
    // infinite scrolling result sets.
    query.limit(1000);

    if (searchValue) {
      query.where(Note.searchIndexes.titleAndContents.match(searchValue));
    }

    if (this._observable) {
      this._observable.dispose();
    }
    this._observable = query.observe().subscribe((nextItems) => {
      this.setState({items: nextItems});
    });
  }

  render() {
    const {selectedId, onSelectItem} = this.props;
    const {items} = this.state;

    return (
      <div className="search-results">
        {
          items.map((item) => {
            return (
              <SidebarItem
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                onSelected={() => onSelectItem(item)}
              />
            );
          })
        }
      </div>
    );
  }
}
