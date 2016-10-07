import React from 'react';
import ReactDOM from 'react-dom';

export default class SidebarItem extends React.Component {
  static propTypes = {
    item: React.PropTypes.object,
    isSelected: React.PropTypes.bool,
    onSelected: React.PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = {editing: null};
  }

  _onDoubleClick = () => {
    const el = ReactDOM.findDOMNode(this);
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    this.setState({editing: true});
  }

  _onKeyDown = (event) => {
    if (event.keyCode === 13) {
      event.target.blur();
    }
  }

  _onBlur = () => {
    const item = this.props.item;
    item.name = ReactDOM.findDOMNode(this).innerText;
    window.dbStore.inTransaction((t) => {
      t.persistModel(item);
    });
    this.setState({editing: null});
  }

  render() {
    const {isSelected, onSelected, item} = this.props;
    const {editing} = this.state;

    const className = `item ${isSelected ? " selected" : ""}`;

    return (
      <div
        className={className}
        onDoubleClick={this._onDoubleClick}
        onBlur={this._onBlur}
        onKeyDown={this._onKeyDown}
        onClick={onSelected}
        contentEditable={editing}
        dangerouslySetInnerHTML={{__html: item.name}}
      />
    )
  }
}
