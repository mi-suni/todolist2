import './App.css';
import { useEffect, useState } from 'react';
import TextField from '@mui/material/TextField';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, setDoc, doc, deleteDoc, getDocs, QuerySnapshot, query, orderBy, where } from "firebase/firestore";
import { GoogleAuthProvider, getAuth, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app)

const provider = new GoogleAuthProvider()
const auth = getAuth(app)

// Todo 아이템 입력하기
const TodoItemInputField = (props) => {
  const [input, setInput] = useState('')
  const onSubmit = () => {
    props.onSubmit(input)
    setInput('')
  }
  
  return (
    <div>
      <TextField
        id = "todo-item-input"
        label = 'Todo Item'
        variant = 'outlined'
        value = {input}
        onChange = {(e) => setInput(e.target.value)} />
        <Button variant='outlined' onClick={onSubmit}>Submit</Button>
    </div>)
};

// 등록된 Todo 아이템
const TodoItem = (props) => {
  const style = props.todoItem.isFinished ? { textDecoration: 'line-through'} : {}
  return (
    <li>
      <span style={style} onClick={() => 
        props.onTodoItemClick(props.todoItem)}>{props.todoItem.todoItemContent}</span>
        <Button variant='outlined' onClick={() => props.onRemoveClick(props.todoItem)}>Remove</Button>
    </li>
  )
}

// 등록된 Todo 아이템 보여주기
const TodoItemList = (props) => {
  const todolist = props.todoItemList.map((todoItem, index) => {
    return <TodoItem key = {index} todoItem = {todoItem} onTodoItemClick = {props.onTodoItemClick} onRemoveClick = {props.onRemoveClick} />
  })
  return (
    <div>
      <ul>{todolist}</ul>
    </div>
  )
}

// user login ui
const TodoListAppBar = (props) => {
  const loginWithGoogleButton = (
    <Button color = 'inherit' onClick={() => {
      signInWithPopup(auth, provider)
    }}>Login with Google</Button>
  )
  const logoutButton = (
    <Button color='inherit' onClick={() => {
      signOut(auth)
    }}>Log out</Button>
  )
  const button = props.currentUser === null ? loginWithGoogleButton : logoutButton
  return (
    <AppBar position = 'static'>
      <Toolbar>
        <Typography variant='h6' component='div' sx={{flexGrow: 1}}>
          Todo List App
        </Typography>
        {button}
      </Toolbar>
    </AppBar>
  )
}

function App() {
  const [todoItemList, setTodoItemList] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  onAuthStateChanged(auth, (user) => {
    if(user) {
      setCurrentUser(user.uid)
    } else {
      setCurrentUser(null)
    }
  })

  const syncTodoItemListStateWithFirestore = () => {
    const q = query(collection(db, 'todoItem'), where('userId', '==', currentUser), orderBy('createdTime', 'desc'))

    getDocs(q).then((QuerySnapshot) => {
      const firestoreTodoItemList = []
      QuerySnapshot.forEach((doc) => {
        firestoreTodoItemList.push({
          id: doc.id,
          todoItemContent: doc.data().todoItemContent,
          isFinished: doc.data().isFinished,
          createdTime: doc.data().createdTime ?? 0,
          userId: doc.data().userId
        })
      })
      setTodoItemList(firestoreTodoItemList)
    })
  }

  useEffect(() => {
    syncTodoItemListStateWithFirestore()
  }, [currentUser])

  const onSubmit = async (newTodoItem) => {
    await addDoc(collection(db, 'todoItem'), {
      todoItemContent: newTodoItem,
      isFinished: false,
      createdTime: Math.floor(Date.now() / 1000),
      userId: currentUser
    })
    // setTodoItemList([...todoItemList, {
    //   id: docRef.id,
    //   todoItemContent: newTodoItem,
    //   isFinished: false
    // }])
    syncTodoItemListStateWithFirestore()
  }

  const onTodoItemClick = async (clickedTodoItem) => {
    const todoItemRef = doc(db, "todoItem", clickedTodoItem.id)
    await setDoc(todoItemRef, { isFinished: !clickedTodoItem.isFinished }, { merge: true });
    // setTodoItemList(todoItemList.map((todoItem) => {
    //   if(clickedTodoItem.id === todoItem.id) {
    //     return {
    //       id: clickedTodoItem.id,
    //       todoItemContent: clickedTodoItem.todoItemContent,
    //       isFinished: !clickedTodoItem.isFinished
    //     }
    //   } else {
    //     return todoItem
    //   }
    // }))
    syncTodoItemListStateWithFirestore()
  }

  const onRemoveClick = async (removeTodoItem) => {
    const todoItemRef = doc(db, 'todoItem', removeTodoItem.id)
    await deleteDoc(todoItemRef)
    // setTodoItemList(todoItemList.filter((todoItem) => {
    //   return todoItem.id !== removeTodoItem.id
    // }))
    syncTodoItemListStateWithFirestore()
  }
  
  return (
    <div className="container">
      <TodoListAppBar currentUser = {currentUser} />
      <TodoItemInputField onSubmit = {onSubmit} />
      <TodoItemList todoItemList = {todoItemList} onTodoItemClick = {onTodoItemClick} onRemoveClick = {onRemoveClick} />
    </div>
  );
}

export default App;
