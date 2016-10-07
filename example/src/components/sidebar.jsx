import React from 'react';

import SidebarItem from './sidebar-item';

export default class Sidebar extends React.Component {
  static propTypes = {
    items: React.PropTypes.array,
    selectedItem: React.PropTypes.object,
    onSelect: React.PropTypes.func,
  };

  render() {
    const {items, onSelect, selectedItem} = this.props;

    return (
      <div className="sidebar">
      {
        items.map((item) => {
          return (
            <SidebarItem
              key={item.id}
              item={item}
              isSelected={selectedItem === item}
              onSelected={() => onSelect(item)}
            />
          );
        })
      }
      </div>
    )
  }
}
