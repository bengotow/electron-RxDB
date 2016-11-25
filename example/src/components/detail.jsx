import React from 'react';
import Note from '../models/note';

export default class Detail extends React.Component {
  static propTypes = {
    itemId: React.PropTypes.string,
  };

  constructor(props) {
    super(props);
    this.state = {item: null};
  }

  componentDidMount(props) {
    this._updateQuery(props);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.itemId !== this.props.itemId) {
      this._updateQuery(nextProps);
    }
  }

  componentWillUnmount() {
    this._updateQuery(null);
  }

  _updateQuery = ({itemId} = {}) => {
    if (this._observable) {
      this._observable.dispose();
      this._observable = null;
    }

    if (itemId) {
      const query = window.Database.find(Note, itemId);
      this._observable = query.observe().subscribe((item) => {
        this.setState({item});
      });
    } else {
      this.setState({item: null});
    }
  }

  _onBlur = () => {
    const {item} = this.state;
    window.Database.inTransaction((t) => {
      item.content = this.refs.content.innerHTML;
      item.name = this.refs.name.innerText;
      item.updatedAt = new Date();
      return t.persistModel(item);
    });
  }

  _onToggleStarred = () => {
    const {item} = this.state;
    window.Database.inTransaction((t) => {
      item.starred = !item.starred;
      return t.persistModel(item);
    });
  }

  _onDelete = () => {
    window.Database.inTransaction((t) => {
      return t.unpersistModel(this.state.item);
    });
  }

  render() {
    if (!this.state.item) {
      return (
        <div className="detail">
          <div className="empty">Please select an item</div>
        </div>
      );
    }

    const {name, content, starred} = this.state.item;
    return (
      <div className="detail">
        <div className="actions">
          <button
            onClick={this._onToggleStarred}
            title="Starred"
            className={`starred is-${starred}`} />
          <button
            onClick={this._onDelete}
            title="Delete"
            className="delete" />
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
