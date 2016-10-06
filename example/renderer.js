import {DatabaseObjectRegistry, DatabaseStore, Model, Attributes} from 'electron-coresqlite';
import ReactDOM from 'react-dom';
import React from 'react';

class Note extends Model {
  static attributes = Object.assign(Model.attributes, {
    name: Attributes.String({
      modelKey: 'name',
      jsonKey: 'name',
      queryable: true,
    }),
    content: Attributes.String({
      modelKey: 'content',
      jsonKey: 'content',
    }),
    createdAt: Attributes.DateTime({
      modelKey: 'createdAt',
      jsonKey: 'createdAt',
      queryable: true,
    }),
  });
}
DatabaseObjectRegistry.register(Note.constructor.name, () => Note)

window.dbStore = new DatabaseStore({
  primary: true,
  databasePath: 'sqlite.db',
  databaseVersion: "1",
  logQueries: false,
  logQueryPlans: false,
});

class SidebarItem extends React.Component {
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

class Sidebar extends React.Component {
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

class Detail extends React.Component {
  static propTypes = {
    item: React.PropTypes.object,
  };

  _onBlur = () => {
    const {item} = this.props;
    item.content = this.refs.content.innerHTML;
    item.name = this.refs.name.innerText;

    window.dbStore.inTransaction((t) => {
      return t.persistModel(item);
    });
  }

  _onPopout = () => {

  }

  _onDelete = () => {
    window.dbStore.inTransaction((t) => {
      return t.unpersistModel(this.props.item);
    });
  }

  render() {
    if (!this.props.item) {
      return (
        <div className="detail">
          <div className="empty">Please select an item</div>
        </div>
      );
    }

    const {name, content} = this.props.item;
    return (
      <div className="detail">
        <div className="actions">
          <button onClick={this._onPopout}> ⇪ </button>
          <button onClick={this._onDelete}> ✖️ </button>
        </div>
        <h2
          ref="name"
          contentEditable
          onBlur={this._onBlur}
          dangerouslySetInnerHTML={{__html: name}}
        />
        <div
          ref="content"
          className="content"
          contentEditable
          dangerouslySetInnerHTML={{__html: content}}
          onBlur={this._onBlur}
        />
      </div>
    );
  }
}

class Container extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      items: [],
      selectedItem: null,
    };
  }

  componentDidMount() {
    const query = window.dbStore.findAll(Note).order(Note.attributes.createdAt.descending());
    this._unsubscribe = query.observe().subscribe((items) => {
      let {selectedItem} = this.state;

      if (selectedItem) {
        const oldIndex = this.state.items.findIndex(({id}) => selectedItem.id === id);
        const nextIndex = items.findIndex(({id}) => selectedItem.id === id);
        if (nextIndex === -1) {
          selectedItem = items[oldIndex] || items[oldIndex - 1] || items[oldIndex + 1];
        }
      }
      this.setState({items, selectedItem});
    });
  }

  componentWillUnmount() {
    this._unsubscribe();
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
    window.dbStore.inTransaction((t) => {
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

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('container');
  ReactDOM.render(<Container />, container);
});
