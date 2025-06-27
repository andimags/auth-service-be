import { faker } from '@faker-js/faker';
import request from "supertest";
import app from '../src/app';

const defaultPassword = 'abcd1234'; // All users use this password

export async function generateUserData(){
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    return {
        username: `${firstName}_${lastName}`,
        email: `${firstName}_${lastName}@gmail.com`,
        first_name: firstName,
        last_name: lastName,
        password: defaultPassword,
        status: 'active'
    }
}

export async function generateChannelData(){
    const name = faker.lorem.words(2);
    const description = faker.lorem.sentence();

    return {
        name: name,
        description: description,
        ref_name: name.replace(' ', '_')
    }
}

export async function generateToken(email: string, password: string){
    const res = await request(app)
        .post('/api/auth/generate-token')
        .send({
            email: email,
            password: password
        });

    return res.body.token;
}