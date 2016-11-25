import React from 'react';

import SidebarItem from '../components/sidebar-item';
import Note from '../models/note';

export default class SidebarRecents extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      items: [],
    };
  }

  componentDidMount() {
    const query = window.Database
      .findAll(Note)
      .order(Note.attributes.updatedAt.descending())
      .limit(2);

    this._observable = query.observe().subscribe((items) => {
      this.setState({items});
    });
  }

  componentWillUnmount() {
    this._observable.dispose();
  }

  render() {
    return (
      <div className="recents">
        <div className="heading">Recent Notes</div>
        {
          this.state.items.map((item) => {
            return (
              <SidebarItem
                key={item.id}
                item={item}
                onSelected={() => this.props.onSelectItem(item)}
              />
            );
          })
        }
      </div>
    );
  }
}
